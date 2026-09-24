import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CheckRepliesResponse,
  QuoteCollectionItem,
  QuoteInboundMessage,
  QuoteOutboundMessage,
  SendPriceInquiryResponse,
  SupplierQuote,
} from '@ai-sdr/contracts';
import { EmailAccountsService } from '../../email-accounts/application/email-accounts.service.js';
import {
  InboundMailPort,
  MailTransportError,
  OutboundMailPort,
  type InboundMailCandidate,
} from '../../email-accounts/domain/messaging.js';
import { EvidenceService } from '../../evidence/application/evidence.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import { PriceInquiryService } from '../../price-inquiry/application/price-inquiry.service.js';
import type { PriceInquiryDraftRecord } from '../../price-inquiry/domain/types.js';
import { SenderProfilesService } from '../../sender-profiles/application/sender-profiles.service.js';
import type { SenderProfileRecord } from '../../sender-profiles/domain/types.js';
import { buildMessageId } from '../domain/message-id.js';
import { deriveMarketResearchPriceState } from '../domain/market-research-state.js';
import { extractQuote } from '../domain/quote-extraction.js';
import {
  matchReply,
  type OutboundRef,
} from '../domain/reply-matching.js';
import type {
  PersistOutboundData,
  PersistQuoteData,
} from '../domain/types.js';
import { QuoteCollectionRepository } from '../infrastructure/quote-collection.repository.js';

/** Bounded reply-scan window; a human action, never automatic. */
const REPLY_SCAN_DAYS = 30;
const REPLY_SCAN_LIMIT = 50;

const SUBMITTED_DETAIL = 'Submitted to outgoing SMTP server';

/**
 * Application service for the market-research supplier quote-collection loop:
 * approval-gated RFQ send, bounded reply capture, correlation, and structured
 * quote extraction. Sending/reading happens only from an explicit human action
 * and only through the `email-accounts` transport ports. This is **market
 * research**, never buyer outreach: it uses the draft's resolved inquiry sender
 * and never the outreach sender.
 */
@Injectable()
export class QuoteCollectionService {
  constructor(
    @Inject(QuoteCollectionRepository)
    private readonly repository: QuoteCollectionRepository,
    @Inject(PriceInquiryService)
    private readonly priceInquiry: PriceInquiryService,
    @Inject(SenderProfilesService)
    private readonly senderProfiles: SenderProfilesService,
    @Inject(EmailAccountsService)
    private readonly emailAccounts: EmailAccountsService,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(EvidenceService)
    private readonly evidence: EvidenceService,
    @Inject(OutboundMailPort)
    private readonly outboundPort: OutboundMailPort,
    @Inject(InboundMailPort)
    private readonly inboundPort: InboundMailPort,
  ) {}

  /** Explicit, confirmed human send of one reviewed RFQ draft. */
  async sendRfq(
    opportunityId: string,
    leadId: string,
    draftId: string,
  ): Promise<SendPriceInquiryResponse> {
    const draft = await this.priceInquiry.getDraft(
      opportunityId,
      leadId,
      draftId,
    );
    await this.assertSendable(draft, draftId);

    const profile = await this.resolveActiveSender(draft);
    const accountId = await this.resolveSendAccount(draft, profile);

    const fromEmail = profile.fromEmail;
    const messageId = buildMessageId(fromEmail, randomUUID());
    const sentAt = new Date();

    const base: PersistOutboundData = {
      priceInquiryDraftId: draft.id,
      opportunityId: draft.opportunityId,
      leadId: draft.leadId,
      companyId: draft.companyId,
      productId: draft.productId,
      senderProfileId: profile.id,
      emailAccountId: accountId,
      fromEmail,
      replyToEmail: profile.replyToEmail,
      recipientEmail: draft.recipientEmail as string,
      subject: draft.subject,
      body: draft.body,
      messageId,
      providerMessageId: null,
      submissionStatus: 'SUBMITTED',
      failureCode: null,
      sentAt,
    };

    let providerMessageId: string | null = null;
    try {
      const result = await this.outboundPort.send(accountId, {
        fromName: profile.senderName,
        fromEmail,
        replyToEmail: profile.replyToEmail,
        to: draft.recipientEmail as string,
        subject: draft.subject,
        text: draft.body,
        messageId,
      });
      providerMessageId = result.providerMessageId;
    } catch (error) {
      const code =
        error instanceof MailTransportError ? error.code : 'send_failed';
      // Persist the failed attempt for audit; the draft stays reviewable.
      await this.repository.createOutbound({
        ...base,
        submissionStatus: 'FAILED',
        failureCode: code,
        providerMessageId: null,
      });
      throw new BadGatewayException({
        error: 'rfq_send_failed',
        code,
      });
    }

    const outbound = await this.repository.createOutbound({
      ...base,
      providerMessageId,
    });
    await this.priceInquiry.markSent(draft.id);
    const updated = await this.priceInquiry.getDraft(
      opportunityId,
      leadId,
      draftId,
    );
    return {
      ok: true,
      detail: SUBMITTED_DETAIL,
      draft: updated as unknown as SendPriceInquiryResponse['draft'],
      outbound: outbound as unknown as QuoteOutboundMessage,
    };
  }

  /**
   * Human-triggered bounded check of the inquiry mailbox for replies to this
   * RFQ. Never automatic; scans a bounded recent window; correlates by header
   * first, bounded fallback only; persists new replies idempotently; extracts a
   * structured quote where a reply is confidently matched.
   */
  async checkReplies(
    opportunityId: string,
    leadId: string,
    draftId: string,
  ): Promise<CheckRepliesResponse> {
    const draft = await this.priceInquiry.getDraft(
      opportunityId,
      leadId,
      draftId,
    );
    if (draft.status === 'READY_FOR_HUMAN_REVIEW') {
      throw new ConflictException({ error: 'rfq_not_sent' });
    }
    const profile = await this.resolveActiveSender(draft);
    const accountId = await this.resolveSendAccount(draft, profile);
    const lead = await this.leads.getLead(opportunityId, leadId);
    const researchRunId = lead.evidence.researchRunId;

    const outbounds = await this.repository.listOutboundsForAccount(accountId);
    const refs: OutboundRef[] = outbounds
      .filter((outbound) => outbound.priceInquiryDraftId === draftId)
      .map((outbound) => ({
        id: outbound.id,
        messageId: outbound.messageId,
        recipientEmail: outbound.recipientEmail,
        subject: outbound.subject,
        sentAt: outbound.sentAt,
      }));

    let candidates: InboundMailCandidate[];
    try {
      candidates = await this.inboundPort.scanRecent(accountId, {
        sinceDays: REPLY_SCAN_DAYS,
        limit: REPLY_SCAN_LIMIT,
      });
    } catch (error) {
      const code =
        error instanceof MailTransportError ? error.code : 'scan_failed';
      throw new BadGatewayException({ error: 'rfq_reply_scan_failed', code });
    }

    const summary = {
      scanned: candidates.length,
      persisted: 0,
      skipped: 0,
      matched: 0,
      extracted: 0,
      unmatched: 0,
    };

    for (const candidate of candidates) {
      const existing = await this.repository.findInboundByMailboxUid(
        accountId,
        candidate.mailboxUid,
      );
      if (existing) {
        summary.skipped += 1;
        continue;
      }

      const match = matchReply(candidate, refs);
      const matched =
        (match.kind === 'header' || match.kind === 'fallback') &&
        refs.some((ref) => ref.id === match.outboundId);

      const inbound = await this.repository.createInbound({
        emailAccountId: accountId,
        outboundMessageId: matched
          ? (match as { outboundId: string }).outboundId
          : null,
        priceInquiryDraftId: matched ? draftId : null,
        mailboxUid: candidate.mailboxUid,
        providerMessageId: candidate.providerMessageId,
        inReplyTo: candidate.inReplyTo,
        references: candidate.references,
        fromEmail: candidate.fromEmail,
        toEmail: candidate.toEmail,
        subject: candidate.subject,
        // Privacy: an unrelated/unmatched message keeps only bounded metadata
        // (needed for idempotent scanning + human review) — never its body.
        bodyText: matched ? candidate.text : '',
        receivedAt: candidate.receivedAt,
        processingStatus: matched ? 'MATCHED' : 'UNMATCHED',
        matchConfidence:
          match.kind === 'header'
            ? 'HEADER'
            : match.kind === 'fallback'
              ? 'FALLBACK'
              : 'NONE',
        researchRunId: matched ? researchRunId : null,
        sourceReferenceId: null,
        evidenceId: null,
      });
      summary.persisted += 1;

      if (!matched) {
        summary.unmatched += 1;
        continue;
      }
      summary.matched += 1;
      await this.priceInquiry.markReplyReceived(draftId);

      const { sourceReferenceId, evidenceId } = await this.persistEvidence(
        opportunityId,
        researchRunId,
        accountId,
        candidate,
      );

      const quote = extractQuote(candidate.text);
      const quoteData: PersistQuoteData = {
        inboundMessageId: inbound.id,
        outboundMessageId: inbound.outboundMessageId,
        priceInquiryDraftId: draftId,
        researchRunId,
        priceText: quote.priceText,
        priceAmount: quote.priceAmount,
        currency: quote.currency,
        priceUnit: quote.priceUnit,
        moqText: quote.moqText,
        incoterm: quote.incoterm,
        loadingLocationText: quote.loadingLocationText,
        leadTimeText: quote.leadTimeText,
        validityText: quote.validityText,
        vatIncluded: quote.vatIncluded,
        qualificationText: quote.qualificationText,
        fieldProvenance: quote.fieldProvenance,
        warnings: quote.warnings,
        sourceReferenceId,
        evidenceId,
      };
      await this.repository.createQuote(quoteData);

      await this.repository.updateInboundMatch(inbound.id, {
        outboundMessageId: inbound.outboundMessageId,
        priceInquiryDraftId: draftId,
        processingStatus: 'EXTRACTED',
        matchConfidence: inbound.matchConfidence,
        researchRunId,
        sourceReferenceId,
        evidenceId,
      });
      await this.priceInquiry.markQuoteExtracted(draftId);
      summary.extracted += 1;
    }

    // Build the response from the post-transition state so the reported state
    // always equals what is persisted.
    const fresh = await this.priceInquiry.getDraft(
      opportunityId,
      leadId,
      draftId,
    );
    const item = await this.buildItem(opportunityId, leadId, fresh);
    return { ...summary, items: [item] };
  }

  /** Read-only collection view for the RFQ review screen. */
  async listCollection(
    opportunityId: string,
    leadId: string,
  ): Promise<QuoteCollectionItem[]> {
    const drafts = await this.priceInquiry.listDrafts(opportunityId, leadId);
    const items: QuoteCollectionItem[] = [];
    for (const draft of drafts) {
      items.push(await this.buildItem(opportunityId, leadId, draft));
    }
    return items;
  }

  private async buildItem(
    opportunityId: string,
    leadId: string,
    draft: PriceInquiryDraftRecord,
  ): Promise<QuoteCollectionItem> {
    const [outbounds, inbounds, quotes] = await Promise.all([
      this.repository.listOutboundsForDrafts([draft.id]),
      this.repository.listInboundsForDrafts([draft.id]),
      this.repository.listQuotesForDrafts([draft.id]),
    ]);
    const outbound = outbounds[0] ?? null;
    return {
      draftId: draft.id,
      marketResearchState: deriveMarketResearchPriceState(
        draft.status,
        outbound?.sentAt ?? null,
      ),
      outbound: outbound as unknown as QuoteOutboundMessage | null,
      inboundMessages: inbounds as unknown as QuoteInboundMessage[],
      quotes: quotes as unknown as SupplierQuote[],
    };
  }

  /** Stores the reply as run evidence; returns the created references. */
  private async persistEvidence(
    opportunityId: string,
    researchRunId: string,
    accountId: string,
    candidate: InboundMailCandidate,
  ): Promise<{ sourceReferenceId: string; evidenceId: string }> {
    const record = await this.evidence.persistEvidence(
      opportunityId,
      researchRunId,
      {
        url: `urn:email:${accountId}:${candidate.mailboxUid}`,
        title: candidate.subject ?? 'Supplier reply',
        sourceType: 'EMAIL_REPLY',
        evidenceText: candidate.text,
        verificationStatus: 'VERIFIED',
        ...(candidate.receivedAt !== null
          ? { retrievedAt: candidate.receivedAt }
          : {}),
      },
    );
    return {
      sourceReferenceId: record.sourceReferenceId,
      evidenceId: record.id,
    };
  }

  /** Send preconditions shared by send and reply-check. */
  private async assertSendable(
    draft: PriceInquiryDraftRecord,
    draftId: string,
  ): Promise<void> {
    if (
      draft.status === 'SENT' ||
      draft.status === 'REPLY_RECEIVED' ||
      draft.status === 'QUOTE_EXTRACTED'
    ) {
      throw new ConflictException({ error: 'rfq_already_sent' });
    }
    if (draft.status !== 'READY_FOR_HUMAN_REVIEW') {
      throw new ConflictException({ error: 'rfq_not_ready_to_send' });
    }
    if (draft.inputsStale) {
      throw new ConflictException({ error: 'rfq_inputs_stale' });
    }
    if (!draft.recipientEmail) {
      throw new ConflictException({ error: 'recipient_required' });
    }
    if (draft.subject.trim().length === 0 || draft.body.trim().length === 0) {
      throw new BadRequestException({ error: 'draft_subject_or_body_missing' });
    }
    const already = await this.repository.findSubmittedOutboundForDraft(draftId);
    if (already) {
      throw new ConflictException({ error: 'rfq_already_sent' });
    }
  }

  private async resolveActiveSender(
    draft: PriceInquiryDraftRecord,
  ): Promise<SenderProfileRecord> {
    if (!draft.senderProfileId) {
      throw new ConflictException({ error: 'inquiry_sender_profile_required' });
    }
    const profile = await this.senderProfiles.getProfile(draft.senderProfileId);
    if (!profile) {
      throw new NotFoundException({ error: 'sender_profile_not_found' });
    }
    if (profile.status !== 'ACTIVE') {
      throw new ConflictException({ error: 'sender_profile_disabled' });
    }
    return profile;
  }

  private async resolveSendAccount(
    draft: PriceInquiryDraftRecord,
    profile: SenderProfileRecord,
  ): Promise<string> {
    const accountId = draft.emailAccountId ?? profile.emailAccountId;
    if (!accountId) {
      throw new ConflictException({ error: 'sender_profile_not_linked' });
    }
    const account = await this.emailAccounts.getAccountOrThrow(accountId);
    if (account.status !== 'ACTIVE') {
      throw new ConflictException({ error: 'email_account_disabled' });
    }
    return accountId;
  }
}
