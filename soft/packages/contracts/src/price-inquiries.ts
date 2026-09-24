import { z } from 'zod';

/**
 * Price inquiry / RFQ draft contracts (write + read).
 *
 * A price inquiry draft is generated from persisted product/specification data
 * and linked to the opportunity, lead, company, product, selected published
 * recipient, and sender identity. It starts at `READY_FOR_HUMAN_REVIEW`; an
 * explicit human send (owned by `quote-collection`) moves it through `SENT`,
 * `REPLY_RECEIVED`, and `QUOTE_EXTRACTED`. Drafting alone never sends.
 */

export const PriceInquiryPurposeSchema = z.enum(['PRICE_INQUIRY']);
export const PriceInquiryStatusSchema = z.enum([
  'READY_FOR_HUMAN_REVIEW',
  'SENT',
  'REPLY_RECEIVED',
  'QUOTE_EXTRACTED',
  'NO_RESPONSE',
]);

const email = z.email().max(320);

/**
 * Create inputs. `productId` is required. Sender resolution order:
 * 1. an explicit `senderProfileId` (validated), else
 * 2. the product's `inquirySenderProfileId`, else
 * 3. a `409 inquiry_sender_profile_required` error.
 * The product's **outreach** sender is a separate context and is never used.
 * The resolved profile must be ACTIVE and linked to an email account.
 * `contactId` overrides the automatic recipient selection (must be a usable
 * published contact).
 */
export const CreatePriceInquiryDraftSchema = z.strictObject({
  productId: z.uuid(),
  senderProfileId: z.uuid().optional(),
  contactId: z.uuid().optional(),
  language: z.string().trim().min(2).max(35).optional(),
});

/** Editable review fields. The originally generated subject/body are preserved. */
export const UpdatePriceInquiryDraftSchema = z.strictObject({
  subject: z.string().trim().min(1).max(512).optional(),
  body: z.string().min(1).max(20000).optional(),
  recipientEmail: email.nullable().optional(),
  senderProfileId: z.uuid().nullable().optional(),
  contactId: z.uuid().nullable().optional(),
});

export const PriceInquirySenderSnapshotSchema = z.strictObject({
  senderName: z.string(),
  senderTitle: z.string().nullable(),
  companyName: z.string().nullable(),
  fromEmail: z.string(),
  replyToEmail: z.string().nullable(),
  signature: z.string().nullable(),
});

export const PriceInquiryDraftResponseSchema = z.strictObject({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  leadId: z.string().min(1),
  companyId: z.string().min(1),
  productId: z.string().min(1),
  contactId: z.string().nullable(),
  recipientEmail: z.string().nullable(),
  recipientRationale: z.string(),
  senderProfileId: z.string().nullable(),
  emailAccountId: z.string().nullable(),
  senderSnapshot: PriceInquirySenderSnapshotSchema.nullable(),
  purpose: PriceInquiryPurposeSchema,
  status: PriceInquiryStatusSchema,
  language: z.string(),
  subject: z.string(),
  body: z.string(),
  generatedSubject: z.string(),
  generatedBody: z.string(),
  specificationSummary: z.string(),
  rationale: z.string(),
  sourceReferenceId: z.string().nullable(),
  evidenceId: z.string().nullable(),
  claimId: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  inputsStale: z.boolean(),
  staleReasons: z.array(z.string()),
});

export type PriceInquiryPurpose = z.infer<typeof PriceInquiryPurposeSchema>;
export type PriceInquiryStatus = z.infer<typeof PriceInquiryStatusSchema>;
export type CreatePriceInquiryDraftInput = z.infer<
  typeof CreatePriceInquiryDraftSchema
>;
export type UpdatePriceInquiryDraftInput = z.infer<
  typeof UpdatePriceInquiryDraftSchema
>;
export type PriceInquirySenderSnapshot = z.infer<
  typeof PriceInquirySenderSnapshotSchema
>;
export type PriceInquiryDraftResponse = z.infer<
  typeof PriceInquiryDraftResponseSchema
>;
