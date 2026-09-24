import { describe, it, expect } from 'vitest';
import { FollowUpService } from '../src/modules/quote-collection/application/follow-up.service.js';
import { QuoteFollowUpRepository } from '../src/modules/quote-collection/infrastructure/quote-follow-up.repository.js';
import { QuoteCollectionService } from '../src/modules/quote-collection/application/quote-collection.service.js';
import { PriceInquiryService } from '../src/modules/price-inquiry/application/price-inquiry.service.js';

interface ScheduleRow {
  id: string;
  priceInquiryDraftId: string;
  emailAccountId: string;
  opportunityId: string;
  leadId: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'EXPIRED';
  attemptCount: number;
  nextCheckAt: Date;
  lockedUntil: Date | null;
  createdAt: Date;
}

class FakeFollowUps {
  rescheduleCalls: Array<{ nextCheckAt: Date; result: string }> = [];
  expireCalls: string[] = [];
  completedCalls: string[] = [];
  constructor(private readonly row: ScheduleRow) {}
  async listDue(now: Date) {
    return this.row.status === 'SCHEDULED' &&
      this.row.nextCheckAt.getTime() <= now.getTime() &&
      (this.row.lockedUntil === null || this.row.lockedUntil.getTime() < now.getTime())
      ? [this.row]
      : [];
  }
  async claim(_id: string, now: Date, leaseUntil: Date) {
    if (
      this.row.status !== 'SCHEDULED' ||
      this.row.nextCheckAt.getTime() > now.getTime() ||
      (this.row.lockedUntil !== null && this.row.lockedUntil.getTime() >= now.getTime())
    ) {
      return null;
    }
    this.row.lockedUntil = leaseUntil;
    this.row.attemptCount += 1;
    return this.row;
  }
  async reschedule(_id: string, nextCheckAt: Date, result: string) {
    this.rescheduleCalls.push({ nextCheckAt, result });
    this.row.nextCheckAt = nextCheckAt;
    this.row.status = 'SCHEDULED';
    this.row.lockedUntil = null;
  }
  async expire(_id: string, result: string) {
    this.expireCalls.push(result);
    this.row.status = 'EXPIRED';
  }
  async markCompleted(_id: string, result: string) {
    this.completedCalls.push(result);
    this.row.status = 'COMPLETED';
  }
}

function build(options: {
  matched: number;
  usablePrice?: boolean;
  sentAt: Date;
  attemptCount?: number;
}) {
  let draftStatus: 'SENT' | 'REPLY_RECEIVED' | 'QUOTE_EXTRACTED' = 'SENT';
  const row: ScheduleRow = {
    id: 'fu1',
    priceInquiryDraftId: 'd1',
    emailAccountId: 'ea1',
    opportunityId: 'o1',
    leadId: 'l1',
    status: 'SCHEDULED',
    attemptCount: options.attemptCount ?? 0,
    nextCheckAt: new Date(options.sentAt.getTime() + 24 * 3_600_000),
    lockedUntil: null,
    createdAt: options.sentAt,
  };
  const followUps = new FakeFollowUps(row);
  let noResponseCalls = 0;
  const quoteCollection = {
    scanAccountReplies: async () => {
      if (options.matched > 0) {
        draftStatus =
          options.usablePrice === false ? 'REPLY_RECEIVED' : 'QUOTE_EXTRACTED';
      }
      return {};
    },
    getLatestOutboundSentAt: async () => options.sentAt,
    markInquiryNoResponse: async () => {
      noResponseCalls += 1;
    },
  };
  const priceInquiry = {
    getDraftById: async () => ({ status: draftStatus }),
  };
  const service = new FollowUpService(
    followUps as unknown as QuoteFollowUpRepository,
    quoteCollection as unknown as QuoteCollectionService,
    priceInquiry as unknown as PriceInquiryService,
  );
  return { service, followUps, row, noResponse: () => noResponseCalls };
}

describe('follow-up worker', () => {
  it('completes when a reply with a usable price is matched', async () => {
    const now = new Date();
    const ctx = build({ matched: 1, sentAt: new Date(now.getTime() - 30 * 3_600_000) });
    const summary = await ctx.service.processDue();
    expect(summary).toMatchObject({ claimed: 1, matched: 1 });
    expect(ctx.followUps.completedCalls).toEqual(['MATCHED']);
    expect(ctx.followUps.rescheduleCalls).toHaveLength(0);
  });

  it('completes when a supplier replied without a usable price', async () => {
    const now = new Date();
    const ctx = build({
      matched: 1,
      usablePrice: false,
      sentAt: new Date(now.getTime() - 30 * 3_600_000),
    });
    const summary = await ctx.service.processDue();
    expect(summary.matched).toBe(1);
    expect(ctx.followUps.completedCalls).toEqual(['MATCHED']);
    expect(ctx.followUps.rescheduleCalls).toHaveLength(0);
    expect(ctx.followUps.expireCalls).toHaveLength(0);
  });

  it('reschedules when no reply exists', async () => {
    const now = new Date();
    const sentAt = new Date(now.getTime() - 25 * 3_600_000);
    const ctx = build({ matched: 0, sentAt });
    const summary = await ctx.service.processDue();
    expect(summary).toMatchObject({ claimed: 1, noReply: 1, expired: 0 });
    expect(ctx.followUps.rescheduleCalls[0]!.result).toBe('NO_REPLY');
    expect(ctx.followUps.rescheduleCalls[0]!.nextCheckAt.toISOString()).toBe(
      new Date(sentAt.getTime() + 48 * 3_600_000).toISOString(),
    );
  });

  it('expires to NO_RESPONSE after the waiting window', async () => {
    const now = new Date();
    const ctx = build({ matched: 0, sentAt: new Date(now.getTime() - 200 * 3_600_000) });
    const summary = await ctx.service.processDue();
    expect(summary).toMatchObject({ claimed: 1, expired: 1, noReply: 0 });
    expect(ctx.followUps.expireCalls).toEqual(['NO_RESPONSE']);
    expect(ctx.noResponse()).toBe(1);
  });

  it('does not process the same due row twice while leased', async () => {
    const now = new Date();
    const ctx = build({ matched: 0, sentAt: new Date(now.getTime() - 25 * 3_600_000) });
    const first = await ctx.service.processDue();
    expect(first.claimed).toBe(1);
    ctx.row.nextCheckAt = new Date(now.getTime() - 1000);
    ctx.row.lockedUntil = new Date(now.getTime() + 60_000);
    const second = await ctx.service.processDue();
    expect(second.claimed).toBe(0);
  });
});
