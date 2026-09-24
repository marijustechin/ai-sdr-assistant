import { describe, it, expect } from 'vitest';
import {
  CheckRepliesResponseSchema,
  MarketResearchPriceStateSchema,
  PriceInquiryStatusSchema,
  QuoteCollectionItemSchema,
  QuoteInboundMessageSchema,
  QuoteOutboundMessageSchema,
  SendPriceInquiryResponseSchema,
  SendPriceInquirySchema,
  SupplierQuoteSchema,
} from '../src/index.js';

const OUTBOUND = {
  id: 'ob1',
  priceInquiryDraftId: 'd1',
  opportunityId: 'o1',
  leadId: 'l1',
  companyId: 'c1',
  productId: 'p1',
  senderProfileId: 's1',
  emailAccountId: 'e1',
  fromEmail: 'sourcing@example.invalid',
  replyToEmail: null,
  recipientEmail: 'supplier@example.invalid',
  subject: 'Price inquiry: Abachi',
  body: 'Please quote.',
  messageId: '<abc@example.invalid>',
  providerMessageId: '<abc@example.invalid>',
  submissionStatus: 'SUBMITTED',
  failureCode: null,
  sentAt: '2026-09-24T10:00:00.000Z',
  createdAt: '2026-09-24T10:00:00.000Z',
};

const INBOUND = {
  id: 'in1',
  emailAccountId: 'e1',
  outboundMessageId: 'ob1',
  priceInquiryDraftId: 'd1',
  mailboxUid: '12345:7',
  providerMessageId: '<reply@supplier.invalid>',
  inReplyTo: '<abc@example.invalid>',
  references: ['<abc@example.invalid>'],
  fromEmail: 'supplier@example.invalid',
  toEmail: 'sourcing@example.invalid',
  subject: 'Re: Price inquiry: Abachi',
  bodyText: 'Our price is 1200 EUR per m3, MOQ 20 m3, FOB.',
  receivedAt: '2026-09-24T11:00:00.000Z',
  processingStatus: 'EXTRACTED',
  matchConfidence: 'HEADER',
  researchRunId: 'r1',
  sourceReferenceId: 'sr1',
  evidenceId: 'ev1',
  createdAt: '2026-09-24T11:00:00.000Z',
  updatedAt: '2026-09-24T11:00:00.000Z',
};

const QUOTE = {
  id: 'q1',
  inboundMessageId: 'in1',
  outboundMessageId: 'ob1',
  priceInquiryDraftId: 'd1',
  researchRunId: 'r1',
  priceText: '1200 EUR',
  priceAmount: 1200,
  currency: 'EUR',
  priceUnit: 'm3',
  moqText: '20 m3',
  incoterm: 'FOB',
  loadingLocationText: null,
  leadTimeText: null,
  validityText: null,
  vatIncluded: null,
  qualificationText: null,
  fieldProvenance: { priceText: '1200 EUR' },
  warnings: ['unit_not_stated'],
  sourceReferenceId: 'sr1',
  evidenceId: 'ev1',
  createdAt: '2026-09-24T11:00:00.000Z',
};

describe('quote-collection contracts', () => {
  it('extends the price inquiry status with the send/reply/quote lifecycle', () => {
    for (const status of [
      'READY_FOR_HUMAN_REVIEW',
      'SENT',
      'REPLY_RECEIVED',
      'QUOTE_EXTRACTED',
    ]) {
      expect(PriceInquiryStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(PriceInquiryStatusSchema.safeParse('DELIVERED').success).toBe(false);
  });

  it('requires an explicit confirmation to send', () => {
    expect(SendPriceInquirySchema.safeParse({ confirm: true }).success).toBe(
      true,
    );
    expect(SendPriceInquirySchema.safeParse({ confirm: false }).success).toBe(
      false,
    );
    expect(SendPriceInquirySchema.safeParse({}).success).toBe(false);
  });

  it('parses the outbound, inbound and quote read shapes', () => {
    expect(QuoteOutboundMessageSchema.safeParse(OUTBOUND).success).toBe(true);
    expect(QuoteInboundMessageSchema.safeParse(INBOUND).success).toBe(true);
    expect(SupplierQuoteSchema.safeParse(QUOTE).success).toBe(true);
    expect(
      QuoteOutboundMessageSchema.safeParse({ ...OUTBOUND, extra: 1 }).success,
    ).toBe(false);
  });

  it('parses a collection item and the derived market-research state', () => {
    const item = {
      draftId: 'd1',
      marketResearchState: 'QUOTE_EXTRACTED',
      outbound: OUTBOUND,
      inboundMessages: [INBOUND],
      quotes: [QUOTE],
    };
    expect(QuoteCollectionItemSchema.safeParse(item).success).toBe(true);
    expect(
      MarketResearchPriceStateSchema.safeParse('NO_RESPONSE').success,
    ).toBe(true);
    expect(
      MarketResearchPriceStateSchema.safeParse('AWAITING_REPLY').success,
    ).toBe(true);
  });

  it('parses the send and check-replies responses', () => {
    expect(
      SendPriceInquiryResponseSchema.safeParse({
        ok: true,
        detail: 'Submitted to outgoing SMTP server',
        draft: {
          id: 'd1',
          opportunityId: 'o1',
          leadId: 'l1',
          companyId: 'c1',
          productId: 'p1',
          contactId: null,
          recipientEmail: 'supplier@example.invalid',
          recipientRationale: 'published',
          senderProfileId: 's1',
          emailAccountId: 'e1',
          senderSnapshot: null,
          purpose: 'PRICE_INQUIRY',
          status: 'SENT',
          language: 'en',
          subject: 'Price inquiry: Abachi',
          body: 'Please quote.',
          generatedSubject: 'Price inquiry: Abachi',
          generatedBody: 'Please quote.',
          specificationSummary: 'Product: Abachi',
          rationale: 'Generated.',
          sourceReferenceId: null,
          evidenceId: 'ev1',
          claimId: null,
          version: 1,
          createdAt: '2026-09-24T10:00:00.000Z',
          updatedAt: '2026-09-24T10:00:00.000Z',
          inputsStale: false,
          staleReasons: [],
        },
        outbound: OUTBOUND,
      }).success,
    ).toBe(true);

    expect(
      CheckRepliesResponseSchema.safeParse({
        scanned: 3,
        persisted: 1,
        skipped: 2,
        matched: 1,
        extracted: 1,
        unmatched: 0,
        items: [],
      }).success,
    ).toBe(true);
  });
});
