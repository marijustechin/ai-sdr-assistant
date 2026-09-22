import { describe, it, expect } from 'vitest';
import { DashboardSummarySchema } from '../src/index.js';

const valid = {
  products: { active: 2, draft: 1, archived: 0, total: 3 },
  researchRuns: { total: 5, completed: 4 },
  leads: { total: 3 },
  outreachDrafts: { total: 3, prepared: 0, blocked: 3 },
};

describe('dashboard summary contract', () => {
  it('accepts a well-formed summary (including all-zero counts)', () => {
    expect(DashboardSummarySchema.safeParse(valid).success).toBe(true);
    expect(
      DashboardSummarySchema.safeParse({
        products: { active: 0, draft: 0, archived: 0, total: 0 },
        researchRuns: { total: 0, completed: 0 },
        leads: { total: 0 },
        outreachDrafts: { total: 0, prepared: 0, blocked: 0 },
      }).success,
    ).toBe(true);
  });

  it('rejects negative or non-integer counts', () => {
    expect(
      DashboardSummarySchema.safeParse({
        ...valid,
        leads: { total: -1 },
      }).success,
    ).toBe(false);
    expect(
      DashboardSummarySchema.safeParse({
        ...valid,
        outreachDrafts: { total: 1.5, prepared: 0, blocked: 0 },
      }).success,
    ).toBe(false);
  });

  it('rejects missing groups and unknown fields', () => {
    expect(
      DashboardSummarySchema.safeParse({
        products: valid.products,
        researchRuns: valid.researchRuns,
        leads: valid.leads,
      }).success,
    ).toBe(false);
    expect(
      DashboardSummarySchema.safeParse({ ...valid, conversionRate: 0.42 }).success,
    ).toBe(false);
  });
});
