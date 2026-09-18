import { z } from 'zod';

/**
 * Potential-buyer shortlist contracts (write side).
 *
 * A lead is an opportunity-scoped candidate buyer linked to the research
 * evidence that supports its inclusion. Observed facts and the buyer-fit
 * hypothesis are separate fields; the operator review state is a separate
 * dimension. No demand, volume, contact, or score is accepted here.
 */

/** Operator review state of a candidate. Separate from provenance. */
export const LeadReviewStatusSchema = z.enum([
  'UNREVIEWED',
  'SHORTLISTED',
  'REJECTED',
]);

/**
 * An observed business role. Roles may overlap (a company can be both a
 * manufacturer and a competitor); this is an observed attribute, never a
 * qualification or a score. `UNKNOWN` is used when the source does not
 * establish a role.
 */
export const LeadObservedRoleSchema = z.enum([
  'MANUFACTURER',
  'DISTRIBUTOR',
  'IMPORTER',
  'RETAILER',
  'FABRICATOR',
  'INSTALLER',
  'BUILDER',
  'DESIGNER',
  'COMPETITOR',
  'END_USER',
  'OTHER',
  'UNKNOWN',
]);

/**
 * Registers or refreshes a candidate buyer for one opportunity. `researchRunId`
 * + `evidenceId` (and optional `claimId`) are the mandatory provenance; the
 * source reference is derived from the evidence server-side. Repeated
 * submissions of the same company for the same opportunity are idempotent.
 */
export const CreateLeadSchema = z.strictObject({
  companyName: z.string().trim().min(1).max(255),
  website: z.url().max(2048).optional(),
  country: z.string().trim().min(1).max(120).optional(),
  observedActivityText: z.string().trim().min(1).max(4000),
  observedRoles: z.array(LeadObservedRoleSchema).min(1).max(12),
  buyerFitHypothesisText: z.string().trim().min(1).max(4000),
  unknownsText: z.string().trim().min(1).max(4000).optional(),
  nextVerificationStepText: z.string().trim().min(1).max(4000).optional(),
  researchRunId: z.uuid(),
  evidenceId: z.uuid(),
  claimId: z.uuid().optional(),
});

/**
 * Operator review action. A reason is optional; when a lead is returned to
 * `UNREVIEWED` the reason is cleared. Any prior review is preserved as data,
 * not overwritten silently by a resubmission (resubmissions never change the
 * review state).
 */
export const UpdateLeadReviewSchema = z.strictObject({
  reviewStatus: LeadReviewStatusSchema,
  reviewReason: z.string().trim().min(1).max(2000).optional(),
});

export type LeadReviewStatus = z.infer<typeof LeadReviewStatusSchema>;
export type LeadObservedRole = z.infer<typeof LeadObservedRoleSchema>;
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadReviewInput = z.infer<typeof UpdateLeadReviewSchema>;
