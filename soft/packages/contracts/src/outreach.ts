import { z } from 'zod';

/**
 * Initial outreach-draft contracts (write side).
 *
 * A draft is prepared for an eligible lead from supported context/evidence. When
 * essential information (sender identity, offer summary) is not supplied or
 * derivable, the persisted outcome is `BLOCKED` with precise missing fields —
 * never a placeholder labelled as a finished draft. No sending is represented.
 */

export const OutreachPreparationStatusSchema = z.enum(['PREPARED', 'BLOCKED']);

/**
 * Optional provisioning inputs for a preparation run. `contactId`/`language`
 * override the automatic selection (for debugging/operator use). `offerSummary`
 * is a *supplied* fact; when absent the offer name from context is used. The
 * sender identity is resolved from the product's assigned sender profile — it is
 * never supplied here.
 */
export const PrepareOutreachDraftSchema = z.strictObject({
  contactId: z.uuid().optional(),
  language: z.string().trim().min(2).max(35).optional(),
  offerSummary: z.string().trim().min(1).max(1000).optional(),
});

export type OutreachPreparationStatus = z.infer<
  typeof OutreachPreparationStatusSchema
>;
export type PrepareOutreachDraftInput = z.infer<
  typeof PrepareOutreachDraftSchema
>;
