import { describe, it, expect } from 'vitest';
import type {
  CheckRepliesResponse,
  SendPriceInquiryResponse,
} from '@ai-sdr/contracts';
import { QuoteCollectionService } from '../src/modules/quote-collection/application/quote-collection.service.js';
import { QuoteCollectionRepository } from '../src/modules/quote-collection/infrastructure/quote-collection.repository.js';
import { PriceInquiryService } from '../src/modules/price-inquiry/application/price-inquiry.service.js';
import type { PriceInquiryDraftRecord } from '../src/modules/price-inquiry/domain/types.js';
import { SenderProfilesService } from '../src/modules/sender-profiles/application/sender-profiles.service.js';
import { EmailAccountsService } from '../src/modules/email-accounts/application/email-accounts.service.js';
import { LeadDiscovererService } from '../src/modules/lead-discoverer/application/lead-discoverer.service.js';
import { EvidenceService } from '../src/modules/evidence/application/evidence.service.js';
import {
  InboundMailPort,
  MailTransportError,
  OutboundMailPort,
  type InboundMailCandidate,
  type OutboundMailSpec,
} from '../src/modules/email-accounts/domain/messaging.js';

interface StoredOutbound {
  id: string;
  priceInquiryDraftId: string;
  emailAccountId: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  messageId: string;
  submissionStatus: string;
  failureCode: string | null;
  sentAt: Date;
  createdAt: Date;
  [key: string]: unknown;
}

interface StoredInbound {
  id: string;
  emailAccountId: string | null;
  mailboxUid: string;
  priceInquiryDraftId: string | null;
  outboundMessageId: string | null;
  matchConfidence: string;
  processingStatus: string;
  [key: string]: unknown;
}

class FakeRepository {
  outbounds: StoredOutbound[] = [];
  inbounds: StoredInbound[] = [];
  quotes: Record<string, unknown>[] = [];
  private seq = 0;

  async createOutbound(data: Record<string, unknown>): Promise<StoredOutbound> {
    const row = {
      id: `ob${++this.seq}`,
      createdAt: new Date(),
      ...data,
    } as unknown as StoredOutbound;
    this.outbounds.push(row);
    return row;
  }
  async findSubmittedOutboundForDraft(id: string) {
    return (
      this.outbounds.find(
        (o) => o.priceInquiryDraftId === id && o.submissionStatus === 'SUBMITTED',
      ) ?? null
    );
  }
  async listOutboundsForAccount(accountId: string) {
    return this.outbounds.filter(
      (o) =>
        o.emailAccountId === accountId && o.submissionStatus === 'SUBMITTED',
    );
  }
  async listOutboundsForDrafts(ids: string[]) {
    return this.outbounds.filter((o) => ids.includes(o.priceInquiryDraftId));
  }
  async findInboundByMailboxUid(accountId: string, mailboxUid: string) {
    return (
      this.inbounds.find(
        (i) => i.emailAccountId === accountId && i.mailboxUid === mailboxUid,
      ) ?? null
    );
  }
  async createInbound(data: Record<string, unknown>): Promise<StoredInbound> {
    const row = {
      id: `in${++this.seq}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as unknown as StoredInbound;
    this.inbounds.push(row);
    return row;
  }
  async updateInboundMatch(id: string, data: Record<string, unknown>) {
    const row = this.inbounds.find((i) => i.id === id) as StoredInbound;
    Object.assign(row, data);
    return row;
  }
  async createQuote(data: Record<string, unknown>) {
    const row = { id: `q${++this.seq}`, createdAt: new Date(), ...data };
    this.quotes.push(row);
    return row;
  }
  async listInboundsForDrafts(ids: string[]) {
    return this.inbounds.filter(
      (i) => i.priceInquiryDraftId !== null && ids.includes(i.priceInquiryDraftId),
    );
  }
  async listQuotesForDrafts(ids: string[]) {
    return this.quotes.filter((q) => ids.includes(q['priceInquiryDraftId'] as string));
  }
}

class FakePriceInquiry {
  calls: string[] = [];
  constructor(private readonly draft: PriceInquiryDraftRecord) {}
  async getDraft() {
    return this.draft;
  }
  async listDrafts() {
    return [this.draft];
  }
  async markSent() {
    this.calls.push('markSent');
    this.draft.status = 'SENT';
  }
  async markReplyReceived() {
    this.calls.push('markReplyReceived');
    this.draft.status = 'REPLY_RECEIVED';
  }
  async markQuoteExtracted() {
    this.calls.push('markQuoteExtracted');
    this.draft.status = 'QUOTE_EXTRACTED';
  }
}

function draftRecord(
  overrides: Partial<PriceInquiryDraftRecord> = {},
): PriceInquiryDraftRecord {
  return {
    id: 'd1',
    opportunityId: 'o1',
    leadId: 'l1',
    companyId: 'c1',
    productId: 'p1',
    contactId: 'ct1',
    recipientEmail: 'supplier@example.invalid',
    recipientRationale: 'published purchasing contact',
    senderProfileId: 'sp-inquiry',
    emailAccountId: 'ea1',
    senderSnapshot: null,
    purpose: 'PRICE_INQUIRY',
    status: 'READY_FOR_HUMAN_REVIEW',
    language: 'en',
    subject: 'Price inquiry: Abachi',
    body: 'Please quote.',
    generatedSubject: 'Price inquiry: Abachi',
    generatedBody: 'Please quote.',
    specificationSummary: 'Product: Abachi',
    rationale: 'generated',
    sourceReferenceId: null,
    evidenceId: 'ev1',
    claimId: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    inputsStale: false,
    staleReasons: [],
    ...overrides,
  };
}

function buildService(options: {
  draft?: PriceInquiryDraftRecord;
  outboundSend?: (accountId: string, spec: OutboundMailSpec) => Promise<{
    messageId: string;
    providerMessageId: string | null;
  }>;
  candidates?: InboundMailCandidate[];
}) {
  const repository = new FakeRepository();
  const draft = options.draft ?? draftRecord();
  const priceInquiry = new FakePriceInquiry(draft);
  const sent: Array<{ accountId: string; spec: OutboundMailSpec }> = [];
  const outboundPort = {
    send: async (accountId: string, spec: OutboundMailSpec) => {
      sent.push({ accountId, spec });
      if (options.outboundSend) return options.outboundSend(accountId, spec);
      return {
        messageId: spec.messageId,
        providerMessageId: '<provider@example.invalid>',
      };
    },
  };
  const evidenceCalls: unknown[] = [];
  const service = new QuoteCollectionService(
    repository as unknown as QuoteCollectionRepository,
    priceInquiry as unknown as PriceInquiryService,
    {
      getProfile: async (id: string) => ({
        id,
        label: 'Inquiry',
        senderName: 'Tomas Berg',
        senderTitle: 'Sourcing',
        companyName: null,
        fromEmail: 'inquiry@example.invalid',
        replyToEmail: null,
        signature: null,
        status: 'ACTIVE',
        emailAccountId: 'ea1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as SenderProfilesService,
    {
      getAccountOrThrow: async (id: string) => ({
        id,
        label: 'Mailbox',
        accountEmail: 'inquiry@example.invalid',
        status: 'ACTIVE',
      }),
    } as unknown as EmailAccountsService,
    {
      getLead: async () => ({
        id: 'l1',
        evidence: { researchRunId: 'run1' },
      }),
    } as unknown as LeadDiscovererService,
    {
      persistEvidence: async (
        _o: string,
        _r: string,
        input: { url: string },
      ) => {
        evidenceCalls.push(input);
        return { id: 'ev-new', sourceReferenceId: 'sr-new' };
      },
    } as unknown as EvidenceService,
    outboundPort as unknown as OutboundMailPort,
    {
      scanRecent: async () => options.candidates ?? [],
    } as unknown as InboundMailPort,
  );
  return { service, repository, priceInquiry, sent, draft, evidenceCalls };
}

function errorCode(error: unknown): string {
  const response = (error as { getResponse?: () => { error?: string } })
    .getResponse?.();
  return response?.error ?? 'unknown';
}

describe('quote collection service', () => {
  it('sends from the draft inquiry sender and persists an immutable outbound', async () => {
    const ctx = buildService({});
    const result: SendPriceInquiryResponse = await ctx.service.sendRfq(
      'o1',
      'l1',
      'd1',
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('Submitted to outgoing SMTP server');
    expect(ctx.sent).toHaveLength(1);
    expect(ctx.sent[0]!.spec.fromEmail).toBe('inquiry@example.invalid');
    expect(ctx.sent[0]!.spec.messageId).toBe(result.outbound.messageId);
    expect(ctx.repository.outbounds).toHaveLength(1);
    const stored = ctx.repository.outbounds[0]!;
    expect(stored.submissionStatus).toBe('SUBMITTED');
    expect(stored.messageId).toBe(result.outbound.messageId);
    expect(ctx.priceInquiry.calls).toContain('markSent');
  });

  it('persists a failed attempt and leaves the draft reviewable', async () => {
    const ctx = buildService({
      outboundSend: async () => {
        throw new MailTransportError('ECONNREFUSED');
      },
    });
    await expect(ctx.service.sendRfq('o1', 'l1', 'd1')).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'rfq_send_failed',
    );
    expect(ctx.repository.outbounds).toHaveLength(1);
    expect(ctx.repository.outbounds[0]!.submissionStatus).toBe('FAILED');
    expect(ctx.repository.outbounds[0]!.failureCode).toBe('ECONNREFUSED');
    expect(ctx.priceInquiry.calls).not.toContain('markSent');
    expect(ctx.draft.status).toBe('READY_FOR_HUMAN_REVIEW');
  });

  it('refuses to send again once a submitted outbound exists', async () => {
    const ctx = buildService({
      draft: draftRecord({ status: 'SENT' }),
    });
    await expect(ctx.service.sendRfq('o1', 'l1', 'd1')).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'rfq_already_sent',
    );
    expect(ctx.sent).toHaveLength(0);
  });

  it('blocks sending a stale draft', async () => {
    const ctx = buildService({
      draft: draftRecord({ inputsStale: true, staleReasons: ['sender changed'] }),
    });
    await expect(ctx.service.sendRfq('o1', 'l1', 'd1')).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'rfq_inputs_stale',
    );
    expect(ctx.sent).toHaveLength(0);
  });

  it('blocks sending without a usable recipient', async () => {
    const ctx = buildService({ draft: draftRecord({ recipientEmail: null }) });
    await expect(ctx.service.sendRfq('o1', 'l1', 'd1')).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'recipient_required',
    );
  });

  it('matches a reply, stores evidence, extracts a quote and advances state', async () => {
    const ctx = buildService({
      draft: draftRecord({ status: 'SENT' }),
      candidates: [
        {
          mailboxUid: '10:5',
          providerMessageId: '<reply@supplier.invalid>',
          inReplyTo: '<original@example.invalid>',
          references: ['<original@example.invalid>'],
          fromEmail: 'supplier@example.invalid',
          toEmail: 'inquiry@example.invalid',
          subject: 'Re: Price inquiry: Abachi',
          receivedAt: new Date('2026-09-24T11:00:00.000Z'),
          text: 'Our price is 1200 EUR per m3, FOB. Prices exclude VAT. MOQ 20 m3.',
        },
      ],
    });
    // Seed the outbound this reply answers.
    ctx.repository.outbounds.push({
      id: 'ob1',
      priceInquiryDraftId: 'd1',
      emailAccountId: 'ea1',
      recipientEmail: 'supplier@example.invalid',
      subject: 'Price inquiry: Abachi',
      body: 'Please quote.',
      messageId: '<original@example.invalid>',
      submissionStatus: 'SUBMITTED',
      failureCode: null,
      sentAt: new Date('2026-09-24T10:00:00.000Z'),
      createdAt: new Date('2026-09-24T10:00:00.000Z'),
    });

    const result: CheckRepliesResponse = await ctx.service.checkReplies(
      'o1',
      'l1',
      'd1',
    );
    expect(result.scanned).toBe(1);
    expect(result.persisted).toBe(1);
    expect(result.matched).toBe(1);
    expect(result.extracted).toBe(1);
    expect(ctx.repository.quotes).toHaveLength(1);
    expect(ctx.repository.quotes[0]!['priceAmount']).toBe(1200);
    expect(ctx.repository.quotes[0]!['currency']).toBe('EUR');
    expect(ctx.repository.quotes[0]!['incoterm']).toBe('FOB');
    expect(ctx.evidenceCalls).toHaveLength(1);
    expect(ctx.priceInquiry.calls).toContain('markReplyReceived');
    expect(ctx.priceInquiry.calls).toContain('markQuoteExtracted');
    // The reported state matches the persisted (post-transition) state.
    expect(result.items[0]!.marketResearchState).toBe('QUOTE_EXTRACTED');
  });

  it('leaves an unmatched reply persisted but unlinked', async () => {
    const ctx = buildService({
      draft: draftRecord({ status: 'SENT' }),
      candidates: [
        {
          mailboxUid: '10:6',
          providerMessageId: null,
          inReplyTo: null,
          references: [],
          fromEmail: 'someone@example.invalid',
          toEmail: null,
          subject: 'Unrelated',
          receivedAt: new Date('2026-09-24T11:00:00.000Z'),
          text: 'Hello',
        },
      ],
    });
    const result = await ctx.service.checkReplies('o1', 'l1', 'd1');
    expect(result.unmatched).toBe(1);
    expect(result.extracted).toBe(0);
    expect(ctx.repository.inbounds[0]!.processingStatus).toBe('UNMATCHED');
    // Privacy: an unrelated message keeps metadata but no body.
    expect(ctx.repository.inbounds[0]!['bodyText']).toBe('');
    expect(ctx.repository.quotes).toHaveLength(0);
    expect(ctx.priceInquiry.calls).not.toContain('markReplyReceived');
    expect(result.items[0]!.marketResearchState).toBe('AWAITING_REPLY');
  });

  it('does not link a delivered copy of our own outbound message', async () => {
    const ctx = buildService({
      draft: draftRecord({ status: 'SENT' }),
      candidates: [
        {
          mailboxUid: '10:8',
          providerMessageId: '<original@example.invalid>',
          inReplyTo: null,
          references: [],
          fromEmail: 'supplier@example.invalid',
          toEmail: 'inquiry@example.invalid',
          subject: 'Price inquiry: Abachi',
          receivedAt: new Date('2026-09-24T10:00:05.000Z'),
          text: 'Please quote.',
        },
      ],
    });
    ctx.repository.outbounds.push({
      id: 'ob1',
      priceInquiryDraftId: 'd1',
      emailAccountId: 'ea1',
      recipientEmail: 'supplier@example.invalid',
      subject: 'Price inquiry: Abachi',
      body: 'Please quote.',
      messageId: '<original@example.invalid>',
      submissionStatus: 'SUBMITTED',
      failureCode: null,
      sentAt: new Date('2026-09-24T10:00:00.000Z'),
      createdAt: new Date('2026-09-24T10:00:00.000Z'),
    });
    const result = await ctx.service.checkReplies('o1', 'l1', 'd1');
    expect(result.unmatched).toBe(1);
    expect(result.matched).toBe(0);
    expect(ctx.repository.quotes).toHaveLength(0);
    expect(ctx.priceInquiry.calls).not.toContain('markReplyReceived');
  });

  it('does not reprocess an already-seen mailbox message', async () => {
    const ctx = buildService({
      draft: draftRecord({ status: 'SENT' }),
      candidates: [
        {
          mailboxUid: '10:7',
          providerMessageId: null,
          inReplyTo: null,
          references: [],
          fromEmail: 'someone@example.invalid',
          toEmail: null,
          subject: 'Unrelated',
          receivedAt: null,
          text: 'Hello',
        },
      ],
    });
    ctx.repository.inbounds.push({
      id: 'in-existing',
      emailAccountId: 'ea1',
      mailboxUid: '10:7',
      priceInquiryDraftId: null,
      outboundMessageId: null,
      matchConfidence: 'NONE',
      processingStatus: 'UNMATCHED',
    });
    const result = await ctx.service.checkReplies('o1', 'l1', 'd1');
    expect(result.skipped).toBe(1);
    expect(result.persisted).toBe(0);
    expect(ctx.repository.inbounds).toHaveLength(1);
  });

  it('refuses to check replies before the RFQ was sent', async () => {
    const ctx = buildService({});
    await expect(ctx.service.checkReplies('o1', 'l1', 'd1')).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'rfq_not_sent',
    );
  });
});
