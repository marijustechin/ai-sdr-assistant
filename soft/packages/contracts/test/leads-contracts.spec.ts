import { describe, it, expect } from 'vitest';
import {
  CreateLeadSchema,
  LeadObservedRoleSchema,
  LeadReviewStatusSchema,
  UpdateLeadReviewSchema,
} from '../src/index.js';

const RUN_ID = '11111111-1111-4111-8111-111111111111';
const EVIDENCE_ID = '22222222-2222-4222-8222-222222222222';

function validLead() {
  return {
    companyName: 'Pirties Meistrai',
    website: 'https://pirtiesmeistrai.lt',
    country: 'Lithuania',
    observedActivityText: 'Designs and installs saunas across Lithuania.',
    observedRoles: ['INSTALLER', 'BUILDER'],
    buyerFitHypothesisText: 'May buy thermo-Abachi cladding for fit-outs.',
    researchRunId: RUN_ID,
    evidenceId: EVIDENCE_ID,
  };
}

describe('potential-buyer shortlist contracts', () => {
  it('accepts a valid lead and rejects unknown fields', () => {
    expect(CreateLeadSchema.safeParse(validLead()).success).toBe(true);
    expect(
      CreateLeadSchema.safeParse({ ...validLead(), score: 99 }).success,
    ).toBe(false);
  });

  it('requires observed roles, activity, hypothesis and provenance', () => {
    expect(
      CreateLeadSchema.safeParse({ ...validLead(), observedRoles: [] }).success,
    ).toBe(false);
    expect(
      CreateLeadSchema.safeParse({ ...validLead(), observedActivityText: '' })
        .success,
    ).toBe(false);
    expect(
      CreateLeadSchema.safeParse({ ...validLead(), buyerFitHypothesisText: '' })
        .success,
    ).toBe(false);
    expect(
      CreateLeadSchema.safeParse({ ...validLead(), evidenceId: 'not-a-uuid' })
        .success,
    ).toBe(false);
    expect(
      CreateLeadSchema.safeParse({ ...validLead(), website: 'not-a-url' })
        .success,
    ).toBe(false);
  });

  it('exposes the review and observed-role vocabularies', () => {
    expect(LeadReviewStatusSchema.options).toEqual([
      'UNREVIEWED',
      'SHORTLISTED',
      'REJECTED',
    ]);
    expect(LeadObservedRoleSchema.safeParse('INSTALLER').success).toBe(true);
    expect(LeadObservedRoleSchema.safeParse('WIZARD').success).toBe(false);
  });

  it('accepts a review action with an optional reason and rejects extras', () => {
    expect(
      UpdateLeadReviewSchema.safeParse({ reviewStatus: 'SHORTLISTED' }).success,
    ).toBe(true);
    expect(
      UpdateLeadReviewSchema.safeParse({
        reviewStatus: 'REJECTED',
        reviewReason: 'Not a buyer.',
      }).success,
    ).toBe(true);
    expect(
      UpdateLeadReviewSchema.safeParse({ reviewStatus: 'UNKNOWN_STATE' }).success,
    ).toBe(false);
    expect(
      UpdateLeadReviewSchema.safeParse({
        reviewStatus: 'SHORTLISTED',
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
