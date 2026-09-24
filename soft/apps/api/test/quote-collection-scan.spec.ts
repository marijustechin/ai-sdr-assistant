import { describe, it, expect } from 'vitest';
import { QuoteCollectionService } from '../src/modules/quote-collection/application/quote-collection.service.js';
import { QuoteCollectionRepository } from '../src/modules/quote-collection/infrastructure/quote-collection.repository.js';
import { QuoteFollowUpRepository } from '../src/modules/quote-collection/infrastructure/quote-follow-up.repository.js';
import { PriceInquiryService } from '../src/modules/price-inquiry/application/price-inquiry.service.js';
import { SenderProfilesService } from '../src/modules/sender-profiles/application/sender-profiles.service.js';
import { EmailAccountsService } from '../src/modules/email-accounts/application/email-accounts.service.js';
import { LeadDiscovererService } from '../src/modules/lead-discoverer/application/lead-discoverer.service.js';
import { EvidenceService } from '../src/modules/evidence/application/evidence.service.js';
import { MarketResearcherService } from '../src/modules/market-researcher/application/research-runs.service.js';
import {
  InboundMailPort,
  OutboundMailPort,
  type InboundMailCandidate,
} from '../src/modules/email-accounts/domain/messaging.js';

const SWALLOWED_UID = '10:6';
const CONSOLVA_UID = '10:7';

interface Draft {
  id: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  status: string;
}

function candidate(overrides: Partial<InboundMailCandidate>): InboundMailCandidate {
  return {
    mailboxUid: '10:1',
    providerMessageId: null,
    inReplyTo: null,
    references: [],
    fromEmail: 'supplier@example.invalid',
    toEmail: 'inquiry@example.invalid',
    subject: 'Re: Price inquiry',
    receivedAt: new Date('2026-09-24T12:00:00.000Z'),
    text: '',
    ...overrides,
  };
}

function build(candidates: InboundMailCandidate[], existingUnmatched?: {
  mailboxUid: string;
  inReplyTo: string | null;
}) {
  const drafts = new Map<string, Draft>([
    [
      'd1',
      {
        id: 'd1',
        opportunityId: 'o1',
        leadId: 'l1',
        companyId: 'c1',
        status: 'SENT',
      },
    ],
    [
      'd2',
      {
        id: 'd2',
        opportunityId: 'o1',
        leadId: 'l2',
        companyId: 'c2',
        status: 'SENT',
      },
    ],
  ]);
  const outbounds = [
    {
      id: 'ob1',
      priceInquiryDraftId: 'd1',
      emailAccountId: 'ea1',
      messageId: '<msg1@sapiensmetric.eu>',
      recipientEmail: 'consolva@example.invalid',
      subject: 'Dėl termo ayous',
      sentAt: new Date('2026-09-24T10:00:00.000Z'),
      submissionStatus: 'SUBMITTED',
    },
    {
      id: 'ob2',
      priceInquiryDraftId: 'd2',
      emailAccountId: 'ea1',
      messageId: '<msg2@sapiensmetric.eu>',
      recipientEmail: 'medzio@example.invalid',
      subject: 'Dėl termo abachi',
      sentAt: new Date('2026-09-24T10:00:00.000Z'),
      submissionStatus: 'SUBMITTED',
    },
  ];
  const inbounds: Array<Record<string, unknown>> = [];
  const quotes: Array<Record<string, unknown>> = [];
  let seq = 0;
  if (existingUnmatched) {
    inbounds.push({
      id: 'in-existing',
      emailAccountId: 'ea1',
      mailboxUid: existingUnmatched.mailboxUid,
      providerMessageId: null,
      inReplyTo: existingUnmatched.inReplyTo,
      references: [],
      fromEmail: 'laura@example.invalid',
      toEmail: 'inquiry@example.invalid',
      subject: 'Re: Dėl termo abachi',
      bodyText: '',
      receivedAt: null,
      processingStatus: 'UNMATCHED',
      matchConfidence: 'NONE',
      outboundMessageId: null,
      priceInquiryDraftId: null,
      researchRunId: null,
      sourceReferenceId: null,
      evidenceId: null,
    });
  }

  const repository = {
    listOutboundsForAccount: async (acc: string) =>
      outbounds.filter((o) => o.emailAccountId === acc),
    findInboundByMailboxUid: async (acc: string, uid: string) =>
      inbounds.find((i) => i.emailAccountId === acc && i.mailboxUid === uid) ??
      null,
    createInbound: async (data: Record<string, unknown>) => {
      const row = { id: `in${++seq}`, ...data };
      inbounds.push(row);
      return row;
    },
    updateInboundMatch: async (id: string, data: Record<string, unknown>) => {
      const row = inbounds.find((i) => i.id === id)!;
      Object.assign(row, data);
      return row;
    },
    createQuote: async (data: Record<string, unknown>) => {
      const row = { id: `q${++seq}`, ...data };
      quotes.push(row);
      return row;
    },
    findLatestOutboundForDraft: async (draftId: string) =>
      outbounds.find((o) => o.priceInquiryDraftId === draftId) ?? null,
    listOutboundsForDrafts: async (ids: string[]) =>
      outbounds.filter((o) => ids.includes(o.priceInquiryDraftId)),
    listInboundsForDrafts: async (ids: string[]) =>
      inbounds.filter(
        (i) => typeof i.priceInquiryDraftId === 'string' && ids.includes(i.priceInquiryDraftId),
      ),
    listQuotesForDrafts: async (ids: string[]) =>
      quotes.filter((q) => ids.includes(q.priceInquiryDraftId as string)),
  };

  const priceInquiry = {
    getDraftById: async (id: string) => drafts.get(id)!,
    getDraft: async (_o: string, _l: string, id: string) => drafts.get(id)!,
    markReplyReceived: async (id: string) => {
      drafts.get(id)!.status = 'REPLY_RECEIVED';
    },
    markQuoteExtracted: async (id: string) => {
      drafts.get(id)!.status = 'QUOTE_EXTRACTED';
    },
    markSent: async () => {},
    findDraftById: async (id: string) => drafts.get(id) ?? null,
    updateStatus: async (id: string, status: string) => {
      drafts.get(id)!.status = status;
    },
    reconcileReplyState: async (id: string, usable: boolean) => {
      const d = drafts.get(id)!;
      if (d.status === 'REPLY_RECEIVED' || d.status === 'QUOTE_EXTRACTED') {
        d.status = usable ? 'QUOTE_EXTRACTED' : 'REPLY_RECEIVED';
      }
    },
    markNoResponse: async (id: string) => {
      drafts.get(id)!.status = 'NO_RESPONSE';
    },
  };

  const followUps = {
    ensure: async () => ({ id: 'fu' }),
    findForDraft: async (id: string) => ({ id: `fu-${id}`, status: 'SCHEDULED' }),
    markCompleted: async () => {},
    listForDrafts: async () => [],
    listForOpportunity: async () => [],
  };
  const enriched: string[] = [];

  const service = new QuoteCollectionService(
    repository as unknown as QuoteCollectionRepository,
    priceInquiry as unknown as PriceInquiryService,
    {} as unknown as SenderProfilesService,
    {} as unknown as EmailAccountsService,
    {
      getLead: async () => ({ id: 'l1', evidence: { researchRunId: 'run1' } }),
    } as unknown as LeadDiscovererService,
    {
      persistEvidence: async () => ({ id: 'ev-new', sourceReferenceId: 'sr-new' }),
    } as unknown as EvidenceService,
    {} as unknown as OutboundMailPort,
    {
      scanRecent: async () => candidates,
    } as unknown as InboundMailPort,
    followUps as unknown as QuoteFollowUpRepository,
    {
      recordEnrichment: async (runId: string) => {
        enriched.push(runId);
      },
    } as unknown as MarketResearcherService,
  );
  return { service, drafts, inbounds, quotes, enriched };
}

describe('account-wide reply scan (cross-draft correctness)', () => {
  it('routes two replies arriving before the first scan to their own RFQs', async () => {
    const ctx = build([
      candidate({
        mailboxUid: CONSOLVA_UID,
        inReplyTo: '<msg1@sapiensmetric.eu>',
        fromEmail: 'consolva@example.invalid',
        text: 'Deja šio produkto nebepalaikome. Kiek jums reikia, koks biudžetas Eur/m2?',
      }),
      candidate({
        mailboxUid: SWALLOWED_UID,
        inReplyTo: '<msg2@sapiensmetric.eu>',
        fromEmail: 'medzio@example.invalid',
        text: 'Kaina 45 EUR už m2, MOQ 50 m2.',
      }),
    ]);
    const summary = await ctx.service.scanAccountReplies('ea1');
    expect(summary.matched).toBe(2);
    expect(summary.persisted).toBe(2);
    // Consolva replied without a usable price → REPLY_RECEIVED; Medžio with → QUOTE_EXTRACTED.
    expect(ctx.drafts.get('d1')!.status).toBe('REPLY_RECEIVED');
    expect(ctx.drafts.get('d2')!.status).toBe('QUOTE_EXTRACTED');
    expect(summary.noPrice).toBe(1);
    expect(summary.extracted).toBe(1);
    expect(ctx.inbounds).toHaveLength(2);
  });

  it('repairs an already-seen UNMATCHED row whose header references a known RFQ', async () => {
    const ctx = build(
      [
        candidate({
          mailboxUid: SWALLOWED_UID,
          inReplyTo: '<msg2@sapiensmetric.eu>',
          fromEmail: 'medzio@example.invalid',
          text: 'Kaina 45 EUR už m2.',
        }),
      ],
      { mailboxUid: SWALLOWED_UID, inReplyTo: '<msg2@sapiensmetric.eu>' },
    );
    expect(ctx.inbounds).toHaveLength(1);
    expect(ctx.inbounds[0]!['bodyText']).toBe('');
    const summary = await ctx.service.scanAccountReplies('ea1');
    expect(summary.repaired).toBe(1);
    expect(summary.matched).toBe(1);
    expect(ctx.inbounds).toHaveLength(1); // updated, not duplicated
    expect(ctx.inbounds[0]!['bodyText']).toContain('45 EUR');
    expect(ctx.inbounds[0]!['priceInquiryDraftId']).toBe('d2');
    expect(ctx.drafts.get('d2')!.status).toBe('QUOTE_EXTRACTED');
  });

  it('keeps unrelated mail metadata-only and idempotent on re-scan', async () => {
    const ctx = build([
      candidate({ mailboxUid: '10:99', fromEmail: 'spam@example.invalid', subject: 'Spam', text: 'unrelated' }),
    ]);
    const first = await ctx.service.scanAccountReplies('ea1');
    expect(first.unmatched).toBe(1);
    expect(ctx.inbounds[0]!['bodyText']).toBe('');
    expect(ctx.inbounds[0]!['processingStatus']).toBe('UNMATCHED');
    const second = await ctx.service.scanAccountReplies('ea1');
    expect(second.skipped).toBe(1);
    expect(second.persisted).toBe(0);
    expect(ctx.inbounds).toHaveLength(1);
  });

  it('reply with no price stays REPLY_RECEIVED (not QUOTE_EXTRACTED)', async () => {
    const ctx = build([
      candidate({
        mailboxUid: CONSOLVA_UID,
        inReplyTo: '<msg1@sapiensmetric.eu>',
        text: 'Deja nebepalaikome šio produkto.',
      }),
    ]);
    const summary = await ctx.service.scanAccountReplies('ea1');
    expect(summary.noPrice).toBe(1);
    expect(summary.extracted).toBe(0);
    expect(ctx.drafts.get('d1')!.status).toBe('REPLY_RECEIVED');
    // Evidence + extraction warnings are retained.
    expect(ctx.quotes).toHaveLength(1);
    expect(ctx.quotes[0]!['warnings']).toContain('price_not_found');
  });

  it('reply with a usable price is QUOTE_EXTRACTED', async () => {
    const ctx = build([
      candidate({
        mailboxUid: CONSOLVA_UID,
        inReplyTo: '<msg1@sapiensmetric.eu>',
        text: 'Mūsų kaina 1200 EUR už m3, MOQ 20 m3, FOB Klaipėda.',
      }),
    ]);
    const summary = await ctx.service.scanAccountReplies('ea1');
    expect(summary.extracted).toBe(1);
    expect(ctx.drafts.get('d1')!.status).toBe('QUOTE_EXTRACTED');
    expect(ctx.quotes[0]!['priceAmount']).toBe(1200);
    expect(ctx.quotes[0]!['currency']).toBe('EUR');
  });
});
