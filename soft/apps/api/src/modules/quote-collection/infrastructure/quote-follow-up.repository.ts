import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@ai-sdr/database';
import type { QuoteFollowUp } from '@ai-sdr/database';
import type {
  EnsureFollowUpData,
  QuoteFollowUpRecord,
} from '../domain/follow-up-types.js';

function toRecord(row: QuoteFollowUp): QuoteFollowUpRecord {
  return {
    id: row.id,
    priceInquiryDraftId: row.priceInquiryDraftId,
    outboundMessageId: row.outboundMessageId,
    emailAccountId: row.emailAccountId,
    opportunityId: row.opportunityId,
    leadId: row.leadId,
    status: row.status,
    attemptCount: row.attemptCount,
    nextCheckAt: row.nextCheckAt,
    lastCheckedAt: row.lastCheckedAt,
    lockedUntil: row.lockedUntil,
    completedAt: row.completedAt,
    lastResult: row.lastResult,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Typed repository for `quote_follow_ups` (owned by `quote-collection`). The DB
 * row is the source of truth for scheduling; `claim` is a compare-and-swap so a
 * due check is processed by exactly one worker.
 */
@Injectable()
export class QuoteFollowUpRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Creates the schedule once; a repeat is a no-op (unique draft id). */
  async ensure(data: EnsureFollowUpData): Promise<QuoteFollowUpRecord> {
    const row = await this.prisma.db.quoteFollowUp.upsert({
      where: { priceInquiryDraftId: data.priceInquiryDraftId },
      create: {
        priceInquiryDraftId: data.priceInquiryDraftId,
        outboundMessageId: data.outboundMessageId,
        emailAccountId: data.emailAccountId,
        opportunityId: data.opportunityId,
        leadId: data.leadId,
        nextCheckAt: data.nextCheckAt,
        status: 'SCHEDULED',
      },
      update: {},
    });
    return toRecord(row);
  }

  async findForDraft(draftId: string): Promise<QuoteFollowUpRecord | null> {
    const row = await this.prisma.db.quoteFollowUp.findUnique({
      where: { priceInquiryDraftId: draftId },
    });
    return row ? toRecord(row) : null;
  }

  async listForDrafts(draftIds: string[]): Promise<QuoteFollowUpRecord[]> {
    if (draftIds.length === 0) return [];
    const rows = await this.prisma.db.quoteFollowUp.findMany({
      where: { priceInquiryDraftId: { in: draftIds } },
    });
    return rows.map(toRecord);
  }

  async listForOpportunity(
    opportunityId: string,
  ): Promise<QuoteFollowUpRecord[]> {
    const rows = await this.prisma.db.quoteFollowUp.findMany({
      where: { opportunityId },
      orderBy: [{ nextCheckAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  /** Due, unleased schedules, oldest first (bounded). */
  async listDue(now: Date, limit: number): Promise<QuoteFollowUpRecord[]> {
    const rows = await this.prisma.db.quoteFollowUp.findMany({
      where: {
        status: 'SCHEDULED',
        nextCheckAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      orderBy: [{ nextCheckAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  /** CAS claim: exactly one caller moves a due row into a lease. */
  async claim(
    id: string,
    now: Date,
    leaseUntil: Date,
  ): Promise<QuoteFollowUpRecord | null> {
    const result = await this.prisma.db.quoteFollowUp.updateMany({
      where: {
        id,
        status: 'SCHEDULED',
        nextCheckAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      data: {
        lockedUntil: leaseUntil,
        lastCheckedAt: now,
        attemptCount: { increment: 1 },
      },
    });
    if (result.count !== 1) return null;
    return this.findById(id);
  }

  private async findById(id: string): Promise<QuoteFollowUpRecord | null> {
    const row = await this.prisma.db.quoteFollowUp.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async markCompleted(id: string, result: string, now: Date): Promise<void> {
    await this.prisma.db.quoteFollowUp.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        lastResult: result,
        completedAt: now,
        lockedUntil: null,
      },
    });
  }

  async expire(id: string, result: string, now: Date): Promise<void> {
    await this.prisma.db.quoteFollowUp.update({
      where: { id },
      data: {
        status: 'EXPIRED',
        lastResult: result,
        completedAt: now,
        lockedUntil: null,
      },
    });
  }

  async reschedule(
    id: string,
    nextCheckAt: Date,
    lastResult: string,
  ): Promise<void> {
    await this.prisma.db.quoteFollowUp.update({
      where: { id },
      data: { status: 'SCHEDULED', nextCheckAt, lastResult, lockedUntil: null },
    });
  }
}
