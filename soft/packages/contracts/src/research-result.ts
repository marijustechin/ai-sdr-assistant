import { z } from 'zod';
import { PriceInquiryStatusSchema } from './price-inquiries.js';
import { ResearchRunStatusSchema } from './research.js';

/**
 * Research Result finalization + pending-quote follow-up scheduling.
 *
 * A market-research run can be finalized/published while supplier price
 * inquiries are still awaiting replies: the run becomes
 * `COMPLETED_WITH_PENDING_CLARIFICATIONS` (or `COMPLETED` with none pending).
 * Later supplier replies *enrich* the result (bumping `lastEnrichedAt`) without
 * rewriting the frozen snapshot or historical evidence. Follow-up checks are
 * DB-backed and only ever *look for replies* to already sent inquiries.
 */

export const QuoteFollowUpStatusSchema = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'EXPIRED',
]);

/** Per-seller/inquiry clarification state shown on the result. */
export const ResearchClarificationStateSchema = z.enum([
  'AWAITING_REPLY',
  'REPLY_RECEIVED',
  'QUOTE_RECEIVED',
  'NO_RESPONSE',
]);

export const ResearchResultCountsSchema = z.strictObject({
  evidenceCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
  currentSellers: z.number().int().nonnegative(),
  potentialBuyers: z.number().int().nonnegative(),
  publicPriceObservations: z.number().int().nonnegative(),
  /** Sent inquiries still awaiting a reply (excludes NO_RESPONSE). */
  pendingClarifications: z.number().int().nonnegative(),
  /** Supplier replies received without a usable price (REPLY_RECEIVED). */
  repliesReceived: z.number().int().nonnegative(),
  /** Inquiries with a genuinely usable price extracted (QUOTE_EXTRACTED). */
  quotesReceived: z.number().int().nonnegative(),
  noResponseInquiries: z.number().int().nonnegative(),
});

export const ResearchResultInquirySchema = z.strictObject({
  draftId: z.string().min(1),
  companyId: z.string().min(1),
  companyName: z.string(),
  productName: z.string(),
  recipientEmail: z.string().nullable(),
  inquiryStatus: PriceInquiryStatusSchema,
  clarificationState: ResearchClarificationStateSchema,
  quoteId: z.string().nullable(),
  quotePriceText: z.string().nullable(),
  quoteCurrency: z.string().nullable(),
  followUpStatus: QuoteFollowUpStatusSchema.nullable(),
  attemptCount: z.number().int().nonnegative(),
  nextCheckAt: z.string().nullable(),
  lastCheckedAt: z.string().nullable(),
});

export const ResearchResultSchema = z.strictObject({
  runId: z.string().min(1),
  opportunityId: z.string().min(1),
  status: ResearchRunStatusSchema,
  researchCompletedAt: z.string().nullable(),
  lastEnrichedAt: z.string().nullable(),
  /** Immutable summary captured at finalization (may be absent pre-finalize). */
  frozenSnapshot: z.unknown().nullable(),
  counts: ResearchResultCountsSchema,
  inquiries: z.array(ResearchResultInquirySchema),
});

/** Bodyless finalize action (strict object rejects unexpected fields). */
export const FinalizeResearchResultSchema = z.strictObject({});

/** Manual trigger for due follow-up checks (bounded). */
export const RunDueFollowUpsSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).optional(),
});

export const RunDueFollowUpsResponseSchema = z.strictObject({
  claimed: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  noReply: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
});

export type QuoteFollowUpStatus = z.infer<typeof QuoteFollowUpStatusSchema>;
export type ResearchClarificationState = z.infer<
  typeof ResearchClarificationStateSchema
>;
export type ResearchResultCounts = z.infer<typeof ResearchResultCountsSchema>;
export type ResearchResultInquiry = z.infer<typeof ResearchResultInquirySchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type RunDueFollowUpsInput = z.infer<typeof RunDueFollowUpsSchema>;
export type RunDueFollowUpsResponse = z.infer<
  typeof RunDueFollowUpsResponseSchema
>;
