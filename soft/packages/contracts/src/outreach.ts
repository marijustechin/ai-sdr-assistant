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

/**
 * Human outreach eligibility decision, scoped to one opportunity + company.
 *
 * Kept separate from research evidence and from the agent qualification so
 * Market Research stays factual. Any state other than `ELIGIBLE` excludes the
 * company from outreach for that scope and **overrides** the agent gate;
 * `ELIGIBLE` records that no exclusion applies (it does not bypass the normal
 * qualification gate). Not a global company blacklist.
 */
export const OutreachDecisionStatusSchema = z.enum([
  'ELIGIBLE',
  'DO_NOT_CONTACT',
  'EXISTING_RELATIONSHIP',
  'NOT_RELEVANT',
  'ALREADY_CONTACTED',
]);

/** Decision states that exclude a company from outreach. */
export const OUTREACH_EXCLUDING_DECISIONS = [
  'DO_NOT_CONTACT',
  'EXISTING_RELATIONSHIP',
  'NOT_RELEVANT',
  'ALREADY_CONTACTED',
] as const;

/** Provenance of a decision — always human. */
export const OutreachDecisionSourceSchema = z.enum(['HUMAN']);

export const SetOutreachDecisionSchema = z.strictObject({
  decision: OutreachDecisionStatusSchema,
  note: z.string().trim().min(1).max(2000).optional(),
});

export const OutreachDecisionResponseSchema = z.strictObject({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  companyId: z.string().min(1),
  decision: OutreachDecisionStatusSchema,
  note: z.string().nullable(),
  decidedByKind: OutreachDecisionSourceSchema,
  decidedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OutreachDecisionStatus = z.infer<
  typeof OutreachDecisionStatusSchema
>;
export type OutreachDecisionSource = z.infer<
  typeof OutreachDecisionSourceSchema
>;
export type SetOutreachDecisionInput = z.infer<
  typeof SetOutreachDecisionSchema
>;
export type OutreachDecisionResponse = z.infer<
  typeof OutreachDecisionResponseSchema
>;
