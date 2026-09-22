import { z } from 'zod';

/**
 * Admin dashboard summary contract.
 *
 * A small, read-only aggregation over modules that already own their data:
 * products, research runs, leads (`opportunity_companies`), and outreach drafts.
 * It introduces no new business semantics — every number is a count of existing
 * rows under an existing status. It deliberately contains no derived commercial
 * metric (no conversion, no sends, no replies, no revenue).
 */

export const DashboardSummarySchema = z.strictObject({
  products: z.strictObject({
    active: z.number().int().min(0),
    draft: z.number().int().min(0),
    archived: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  researchRuns: z.strictObject({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
  }),
  leads: z.strictObject({
    total: z.number().int().min(0),
  }),
  outreachDrafts: z.strictObject({
    total: z.number().int().min(0),
    prepared: z.number().int().min(0),
    blocked: z.number().int().min(0),
  }),
});

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
