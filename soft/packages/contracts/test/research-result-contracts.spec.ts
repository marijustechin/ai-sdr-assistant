import { describe, it, expect } from 'vitest';
import {
  PriceInquiryStatusSchema,
  ResearchResultSchema,
  ResearchRunStatusSchema,
  RunDueFollowUpsResponseSchema,
  RunDueFollowUpsSchema,
} from '../src/index.js';

describe('research result + follow-up contracts', () => {
  it('adds the completed-with-pending-clarifications run status', () => {
    expect(
      ResearchRunStatusSchema.safeParse('COMPLETED_WITH_PENDING_CLARIFICATIONS')
        .success,
    ).toBe(true);
    expect(ResearchRunStatusSchema.safeParse('RESULT_READY').success).toBe(false);
  });

  it('adds the NO_RESPONSE price-inquiry status', () => {
    expect(PriceInquiryStatusSchema.safeParse('NO_RESPONSE').success).toBe(true);
  });

  it('parses a research result with counts and per-inquiry states', () => {
    const result = {
      runId: 'r1',
      opportunityId: 'o1',
      status: 'COMPLETED_WITH_PENDING_CLARIFICATIONS',
      researchCompletedAt: '2026-09-24T10:00:00.000Z',
      lastEnrichedAt: '2026-09-26T10:00:00.000Z',
      frozenSnapshot: { counts: { pendingClarifications: 1 } },
      counts: {
        evidenceCount: 3,
        sourceCount: 2,
        currentSellers: 1,
        potentialBuyers: 4,
        publicPriceObservations: 2,
        pendingClarifications: 1,
        repliesReceived: 1,
        quotesReceived: 1,
        noResponseInquiries: 1,
      },
      inquiries: [
        {
          draftId: 'd1',
          companyId: 'c1',
          companyName: 'Supplier A',
          productName: 'Abachi',
          recipientEmail: 'a@example.invalid',
          inquiryStatus: 'SENT',
          clarificationState: 'AWAITING_REPLY',
          quoteId: null,
          quotePriceText: null,
          quoteCurrency: null,
          followUpStatus: 'SCHEDULED',
          attemptCount: 1,
          nextCheckAt: '2026-09-26T10:00:00.000Z',
          lastCheckedAt: '2026-09-25T10:00:00.000Z',
        },
      ],
    };
    expect(ResearchResultSchema.safeParse(result).success).toBe(true);
    expect(
      ResearchResultSchema.safeParse({ ...result, extra: 1 }).success,
    ).toBe(false);
  });

  it('parses the manual run-due contract', () => {
    expect(RunDueFollowUpsSchema.safeParse({}).success).toBe(true);
    expect(RunDueFollowUpsSchema.safeParse({ limit: 5 }).success).toBe(true);
    expect(RunDueFollowUpsSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(
      RunDueFollowUpsResponseSchema.safeParse({
        claimed: 2,
        matched: 1,
        noReply: 1,
        expired: 0,
        errors: 0,
      }).success,
    ).toBe(true);
  });
});
