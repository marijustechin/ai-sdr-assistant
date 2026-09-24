import { describe, it, expect } from 'vitest';
import {
  CreatePriceInquiryDraftSchema,
  PriceInquiryDraftResponseSchema,
  UpdatePriceInquiryDraftSchema,
} from '../src/index.js';

const VALID_RESPONSE = {
  id: 'p1',
  opportunityId: 'o1',
  leadId: 'l1',
  companyId: 'c1',
  productId: 'pr1',
  contactId: 'ct1',
  recipientEmail: 'buyer@example.invalid',
  recipientRationale: 'Named contact with a published role relevant to purchasing.',
  senderProfileId: 's1',
  emailAccountId: 'e1',
  senderSnapshot: {
    senderName: 'Sourcing Desk',
    senderTitle: 'Sourcing & Procurement',
    companyName: 'Example Sourcing',
    fromEmail: 'sourcing@example.invalid',
    replyToEmail: null,
    signature: null,
  },
  purpose: 'PRICE_INQUIRY',
  status: 'READY_FOR_HUMAN_REVIEW',
  language: 'en',
  subject: 'Price inquiry: Abachi',
  body: 'Hello,',
  generatedSubject: 'Price inquiry: Abachi',
  generatedBody: 'Hello,',
  specificationSummary: 'Product: Abachi',
  rationale: 'Generated.',
  sourceReferenceId: null,
  evidenceId: 'ev1',
  claimId: 'cl1',
  version: 1,
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
  inputsStale: false,
  staleReasons: [],
};

describe('price inquiry contracts', () => {
  it('accepts future locale values for the draft language', () => {
    for (const language of ['en', 'de', 'fi', 'lt']) {
      expect(
        CreatePriceInquiryDraftSchema.safeParse({
          productId: '11111111-1111-4111-8111-111111111111',
          language,
        }).success,
      ).toBe(true);
    }
  });

  it('requires a productId to create a draft', () => {
    expect(
      CreatePriceInquiryDraftSchema.safeParse({ productId: 'x' }).success,
    ).toBe(false);
    expect(
      CreatePriceInquiryDraftSchema.safeParse({
        productId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
  });

  it('allows editing subject/body/recipient/sender but rejects unknown fields', () => {    expect(
      UpdatePriceInquiryDraftSchema.safeParse({
        subject: 'New',
        body: 'Body',
        recipientEmail: null,
        senderProfileId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
    expect(
      UpdatePriceInquiryDraftSchema.safeParse({ sentAt: 'now' }).success,
    ).toBe(false);
    expect(
      UpdatePriceInquiryDraftSchema.safeParse({ status: 'SENT' }).success,
    ).toBe(false);
  });

  it('validates the read shape and never carries a secret', () => {
    expect(
      PriceInquiryDraftResponseSchema.safeParse(VALID_RESPONSE).success,
    ).toBe(true);
    expect(
      PriceInquiryDraftResponseSchema.safeParse({
        id: 'p1',
        smtpPassword: 'leak',
      }).success,
    ).toBe(false);
    expect(
      PriceInquiryDraftResponseSchema.safeParse({
        ...VALID_RESPONSE,
        status: 'SENT',
      }).success,
    ).toBe(false);
  });
});
