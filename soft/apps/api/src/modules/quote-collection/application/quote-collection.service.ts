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
import {
  nextCheckAt,
  resolveFollowUpPolicy,
} from '../domain/follow-up-policy.js';
import type { InquiryClarificationView } from '../domain/follow-up-types.js';
import { deriveMarketResearchPriceState } from '../domain/market-research-state.js';
import { extractQuote } from '../domain/quote-extraction.js';
import {
  matchReply,
  type OutboundRef,
} from '../domain/reply-matching.js';
import type {
  PersistOutboundData,
  QuoteOutboundRecord,
} from '../domain/types.js';
import { QuoteCollectionRepository } from '../infrastructure/quote-collection.repository.js';
import { QuoteFollowUpRepository } from '../infrastructure/quote-follow-up.repository.js';
import { MarketResearcherService } from '../../market-researcher/application/research-runs.service.js';

/** Bounded reply-scan window; a human action, never automatic. */
const REPLY_SCAN_DAYS = 30;
const REPLY_SCAN_LIMIT = 50;

const SUBMITTED_DETAIL = 'Submitted to outgoing SMTP server';

/** Result of one bounded account-wide reply scan. */
export interface AccountScanSummary {
  scanned: number;
  persisted: number;
  skipped: number;
  matched: number;
  /** Matched replies that yielded a usable price. */
  extracted: number;
  /** Matched replies with no usable price (REPLY_RECEIVED). */
  noPrice: number;
  unmatched: number;
  /** Previously-UNMATCHED rows repaired by this scan. */
  repaired: number;
}

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
    @Inject(QuoteFollowUpRepository)
    private readonly followUps: QuoteFollowUpRepository,
    @Inject(MarketResearcherService)
    private readonly runs: MarketResearcherService,
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
    const firstCheck = nextCheckAt(sentAt, 0, resolveFollowUpPolicy());
    if (firstCheck) {
      await this.followUps.ensure({
        priceInquiryDraftId: draft.id,
        outboundMessageId: outbound.id,
        emailAccountId: outbound.emailAccountId,
        opportunityId: draft.opportunityId,
        leadId: draft.leadId,
        nextCheckAt: firstCheck,
      });
    }
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
   * Bounded, account-wide reply scan. One scan considers **all** sent RFQs for
   * the mailbox, so checking one inquiry can never swallow another inquiry's
   * reply. Header matching (In-Reply-To / References) is authoritative; a
   * bounded fallback is used only when headers are absent and unambiguous. An
   * already-seen UNMATCHED row whose headers now reference a known outbound
   * Message-ID is repaired in place (body re-fetched by its mailbox UID within
   * this bounded scan) rather than skipped.
   */
  async scanAccountReplies(accountId: string): Promise<AccountScanSummary> {
    const outbounds = await this.repository.listOutboundsForAccount(accountId);
    const refs: OutboundRef[] = outbounds.map((outbound) => ({
      id: outbound.id,
      messageId: outbound.messageId,
      recipientEmail: outbound.recipientEmail,
      subject: outbound.subject,
      sentAt: outbound.sentAt,
    }));
    const outboundById = new Map(outbounds.map((o) => [o.id, o]));

    // Reconcile existing reply classifications: a replied inquiry is
    // QUOTE_EXTRACTED only with a usable price, otherwise REPLY_RECEIVED.
    // Idempotent and never touches an unanswered (SENT) inquiry.
    const reconciled = new Set<string>();
    for (const outbound of outbounds) {
      if (reconciled.has(outbound.priceInquiryDraftId)) continue;
      reconciled.add(outbound.priceInquiryDraftId);
      const quotes = await this.repository.listQuotesForDrafts([
        outbound.priceInquiryDraftId,
      ]);
      const usable = quotes.some(
        (q) => q.priceAmount !== null && q.currency !== null,
      );
      await this.priceInquiry.reconcileReplyState(
        outbound.priceInquiryDraftId,
        usable,
      );
    }

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

    const summary: AccountScanSummary = {
      scanned: candidates.length,
      persisted: 0,
      skipped: 0,
      matched: 0,
      extracted: 0,
      noPrice: 0,
      unmatched: 0,
      repaired: 0,
    };

    for (const candidate of candidates) {
      const existing = await this.repository.findInboundByMailboxUid(
        accountId,
        candidate.mailboxUid,
      );
      // Already-processed messages are skipped; a previously UNMATCHED row is
      // re-evaluated (repair) in case it now matches a known outbound.
      if (existing && existing.processingStatus !== 'UNMATCHED') {
        summary.skipped += 1;
        continue;
      }

      const match = matchReply(candidate, refs);
      const outbound =
        match.kind === 'header' || match.kind === 'fallback'
          ? outboundById.get(match.outboundId)
          : undefined;

      if (!outbound) {
        if (existing) {
          summary.skipped += 1; // still unrelated; keep metadata-only
          continue;
        }
        await this.repository.createInbound({
          emailAccountId: accountId,
          outboundMessageId: null,
          priceInquiryDraftId: null,
          mailboxUid: candidate.mailboxUid,
          providerMessageId: candidate.providerMessageId,
          inReplyTo: candidate.inReplyTo,
          references: candidate.references,
          fromEmail: candidate.fromEmail,
          toEmail: candidate.toEmail,
          subject: candidate.subject,
          // Privacy: unrelated mail keeps bounded metadata only, never its body.
          bodyText: '',
          receivedAt: candidate.receivedAt,
          processingStatus: 'UNMATCHED',
          matchConfidence: 'NONE',
          researchRunId: null,
          sourceReferenceId: null,
          evidenceId: null,
        });
        summary.persisted += 1;
        summary.unmatched += 1;
        continue;
      }

      const usablePrice = await this.routeMatchedReply(
        accountId,
        candidate,
        outbound,
        match.kind === 'header' ? 'HEADER' : 'FALLBACK',
        existing,
      );
      if (existing) summary.repaired += 1;
      else summary.persisted += 1;
      summary.matched += 1;
      if (usablePrice) summary.extracted += 1;
      else summary.noPrice += 1;
    }

    return summary;
  }

  /**
   * Routes one matched reply to its RFQ: persists/repairs the inbound row and
   * evidence, extracts the supplier-authored text, advances the inquiry
   * (`REPLY_RECEIVED` always; `QUOTE_EXTRACTED` only with a usable price),
   * completes the follow-up and enriches the run result. Returns whether a
   * usable price was found.
   */
  private async routeMatchedReply(
    accountId: string,
    candidate: InboundMailCandidate,
    outbound: QuoteOutboundRecord,
    confidence: 'HEADER' | 'FALLBACK',
    existing: { id: string } | null,
  ): Promise<boolean> {
    const draftId = outbound.priceInquiryDraftId;
    const draft = await this.priceInquiry.getDraftById(draftId);
    const runId = (await this.leads.getLead(draft.opportunityId, draft.leadId))
      .evidence.researchRunId;

    const { sourceReferenceId, evidenceId } = await this.persistEvidence(
      draft.opportunityId,
      runId,
      accountId,
      candidate,
    );

    const quote = extractQuote(candidate.text);
    const usablePrice = quote.priceAmount !== null && quote.currency !== null;
    const processingStatus = usablePrice ? 'EXTRACTED' : 'MATCHED';

    let inboundId: string;
    if (existing) {
      await this.repository.updateInboundMatch(existing.id, {
        outboundMessageId: outbound.id,
        priceInquiryDraftId: draftId,
        processingStatus,
        matchConfidence: confidence,
        researchRunId: runId,
        sourceReferenceId,
        evidenceId,
        bodyText: candidate.text,
      });
      inboundId = existing.id;
    } else {
      const created = await this.repository.createInbound({
        emailAccountId: accountId,
        outboundMessageId: outbound.id,
        priceInquiryDraftId: draftId,
        mailboxUid: candidate.mailboxUid,
        providerMessageId: candidate.providerMessageId,
        inReplyTo: candidate.inReplyTo,
        references: candidate.references,
        fromEmail: candidate.fromEmail,
        toEmail: candidate.toEmail,
        subject: candidate.subject,
        bodyText: candidate.text,
        receivedAt: candidate.receivedAt,
        processingStatus,
        matchConfidence: confidence,
        researchRunId: runId,
        sourceReferenceId,
        evidenceId,
      });
      inboundId = created.id;
    }

    await this.repository.createQuote({
      inboundMessageId: inboundId,
      outboundMessageId: outbound.id,
      priceInquiryDraftId: draftId,
      researchRunId: runId,
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
    });

    if (draft.status === 'SENT') {
      await this.priceInquiry.markReplyReceived(draftId);
    }
    if (usablePrice && draft.status !== 'QUOTE_EXTRACTED') {
      await this.priceInquiry.markQuoteExtracted(draftId);
    }

    const followUp = await this.followUps.findForDraft(draftId);
    if (followUp && followUp.status === 'SCHEDULED') {
      await this.followUps.markCompleted(
        followUp.id,
        usablePrice ? 'MATCHED' : 'REPLIED',
        new Date(),
      );
    }
    await this.runs.recordEnrichment(runId);
    return usablePrice;
  }

  /**
   * Human-triggered bounded check of the inquiry mailbox. It runs the
   * account-wide scan above (so a shared mailbox routes every reply to its own
   * RFQ) and returns the resulting collection item for this draft.
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

    const summary = await this.scanAccountReplies(accountId);

    const fresh = await this.priceInquiry.getDraft(
      opportunityId,
      leadId,
      draftId,
    );
    const item = await this.buildItem(opportunityId, leadId, fresh);
    return {
      scanned: summary.scanned,
      persisted: summary.persisted,
      skipped: summary.skipped,
      matched: summary.matched,
      extracted: summary.extracted,
      unmatched: summary.unmatched,
      items: [item],
    };
  }

  /** Read-only follow-up schedules for an opportunity (operator inspection). */
  async listFollowUpsForOpportunity(opportunityId: string) {
    return this.followUps.listForOpportunity(opportunityId);
  }

  /** The send time of the latest outbound message for a draft (for policy). */
  async getLatestOutboundSentAt(draftId: string): Promise<Date | null> {
    const outbound = await this.repository.findLatestOutboundForDraft(draftId);
    return outbound ? outbound.sentAt : null;
  }

  /**
   * Marks a still-waiting inquiry as NO_RESPONSE (waiting window elapsed) and
   * enriches the research result. Only applies while the inquiry is still
   * `SENT`; records are preserved.
   */
  async markInquiryNoResponse(draftId: string): Promise<void> {
    const draft = await this.priceInquiry.getDraftById(draftId);
    if (draft.status !== 'SENT') return;
    await this.priceInquiry.markNoResponse(draftId);
    const lead = await this.leads.getLead(draft.opportunityId, draft.leadId);
    await this.runs.recordEnrichment(lead.evidence.researchRunId);
  }

  /**
   * Per-draft clarification/follow-up view used by the research-result read
   * model (quote + schedule state), without duplicating the draft lifecycle.
   */
  async getInquiryViews(
    draftIds: string[],
  ): Promise<InquiryClarificationView[]> {
    if (draftIds.length === 0) return [];
    const [quotes, followUps] = await Promise.all([
      this.repository.listQuotesForDrafts(draftIds),
      this.followUps.listForDrafts(draftIds),
    ]);
    return draftIds.map((draftId) => {
      const quote =
        quotes.find((q) => q.priceInquiryDraftId === draftId) ?? null;
      const followUp =
        followUps.find((f) => f.priceInquiryDraftId === draftId) ?? null;
      return {
        draftId,
        quoteId: quote?.id ?? null,
        quotePriceText: quote?.priceText ?? null,
        quoteCurrency: quote?.currency ?? null,
        followUpStatus: followUp?.status ?? null,
        attemptCount: followUp?.attemptCount ?? 0,
        nextCheckAt: followUp?.nextCheckAt ?? null,
        lastCheckedAt: followUp?.lastCheckedAt ?? null,
      };
    });
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
