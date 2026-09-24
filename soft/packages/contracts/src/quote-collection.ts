import { z } from 'zod';
import { PriceInquiryDraftResponseSchema } from './price-inquiries.js';

/**
 * Market-research supplier quote collection contracts.
 *
 * This is the controlled RFQ loop for **market research** (supplier price
 * inquiries), not buyer outreach. A reviewed `PriceInquiryDraft` is sent from
 * its resolved inquiry sender; the outbound message snapshot is immutable and
 * its Message-ID is preserved; bounded IMAP reply capture correlates a supplier
 * reply to the RFQ; structured commercial terms are extracted only where the
 * reply states them. No credentials are ever part of these shapes.
 */

export const QuoteOutboundStatusSchema = z.enum(['SUBMITTED', 'FAILED']);
export const QuoteInboundStatusSchema = z.enum([
  'MATCHED',
  'UNMATCHED',
  'EXTRACTED',
]);
export const QuoteMatchConfidenceSchema = z.enum([
  'HEADER',
  'FALLBACK',
  'NONE',
]);

/** Derived market-research price state of an RFQ (a view, not a workflow). */
export const MarketResearchPriceStateSchema = z.enum([
  'PRICE_INQUIRY_PREPARED',
  'AWAITING_REPLY',
  'REPLY_RECEIVED',
  'QUOTE_EXTRACTED',
  'NO_RESPONSE',
]);

/** Explicit human approval. `confirm` must be `true`; never automatic. */
export const SendPriceInquirySchema = z.strictObject({
  confirm: z.literal(true),
});

export const QuoteOutboundMessageSchema = z.strictObject({
  id: z.string().min(1),
  priceInquiryDraftId: z.string().min(1),
  opportunityId: z.string().min(1),
  leadId: z.string().min(1),
  companyId: z.string().min(1),
  productId: z.string().min(1),
  senderProfileId: z.string().nullable(),
  emailAccountId: z.string().nullable(),
  fromEmail: z.string(),
  replyToEmail: z.string().nullable(),
  recipientEmail: z.string(),
  subject: z.string(),
  body: z.string(),
  messageId: z.string(),
  providerMessageId: z.string().nullable(),
  submissionStatus: QuoteOutboundStatusSchema,
  failureCode: z.string().nullable(),
  sentAt: z.string(),
  createdAt: z.string(),
});

export const QuoteInboundMessageSchema = z.strictObject({
  id: z.string().min(1),
  emailAccountId: z.string().nullable(),
  outboundMessageId: z.string().nullable(),
  priceInquiryDraftId: z.string().nullable(),
  mailboxUid: z.string(),
  providerMessageId: z.string().nullable(),
  inReplyTo: z.string().nullable(),
  references: z.array(z.string()),
  fromEmail: z.string().nullable(),
  toEmail: z.string().nullable(),
  subject: z.string().nullable(),
  bodyText: z.string(),
  receivedAt: z.string().nullable(),
  processingStatus: QuoteInboundStatusSchema,
  matchConfidence: QuoteMatchConfidenceSchema,
  researchRunId: z.string().nullable(),
  sourceReferenceId: z.string().nullable(),
  evidenceId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SupplierQuoteSchema = z.strictObject({
  id: z.string().min(1),
  inboundMessageId: z.string().min(1),
  outboundMessageId: z.string().nullable(),
  priceInquiryDraftId: z.string().nullable(),
  researchRunId: z.string().nullable(),
  priceText: z.string().nullable(),
  priceAmount: z.number().nullable(),
  currency: z.string().nullable(),
  priceUnit: z.string().nullable(),
  moqText: z.string().nullable(),
  incoterm: z.string().nullable(),
  loadingLocationText: z.string().nullable(),
  leadTimeText: z.string().nullable(),
  validityText: z.string().nullable(),
  vatIncluded: z.boolean().nullable(),
  qualificationText: z.string().nullable(),
  fieldProvenance: z.record(z.string(), z.string()).nullable(),
  warnings: z.array(z.string()),
  sourceReferenceId: z.string().nullable(),
  evidenceId: z.string().nullable(),
  createdAt: z.string(),
});

/** Per-draft view of the collection, keyed by the RFQ draft id. */
export const QuoteCollectionItemSchema = z.strictObject({
  draftId: z.string().min(1),
  marketResearchState: MarketResearchPriceStateSchema,
  outbound: QuoteOutboundMessageSchema.nullable(),
  inboundMessages: z.array(QuoteInboundMessageSchema),
  quotes: z.array(SupplierQuoteSchema),
});

export const SendPriceInquiryResponseSchema = z.strictObject({
  ok: z.boolean(),
  detail: z.string(),
  draft: PriceInquiryDraftResponseSchema,
  outbound: QuoteOutboundMessageSchema,
});

export const CheckRepliesResponseSchema = z.strictObject({
  scanned: z.number().int().nonnegative(),
  persisted: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  extracted: z.number().int().nonnegative(),
  unmatched: z.number().int().nonnegative(),
  items: z.array(QuoteCollectionItemSchema),
});

export type QuoteOutboundStatus = z.infer<typeof QuoteOutboundStatusSchema>;
export type QuoteInboundStatus = z.infer<typeof QuoteInboundStatusSchema>;
export type QuoteMatchConfidence = z.infer<typeof QuoteMatchConfidenceSchema>;
export type MarketResearchPriceState = z.infer<
  typeof MarketResearchPriceStateSchema
>;
export type SendPriceInquiryInput = z.infer<typeof SendPriceInquirySchema>;
export type QuoteOutboundMessage = z.infer<typeof QuoteOutboundMessageSchema>;
export type QuoteInboundMessage = z.infer<typeof QuoteInboundMessageSchema>;
export type SupplierQuote = z.infer<typeof SupplierQuoteSchema>;
export type QuoteCollectionItem = z.infer<typeof QuoteCollectionItemSchema>;
export type SendPriceInquiryResponse = z.infer<
  typeof SendPriceInquiryResponseSchema
>;
export type CheckRepliesResponse = z.infer<typeof CheckRepliesResponseSchema>;
