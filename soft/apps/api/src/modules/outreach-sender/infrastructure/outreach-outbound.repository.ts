import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type {
  CreateOutboundData,
  OutboundRecord,
  OutreachSentCopyStatus,
} from '../domain/types.js';

type Outbound = Prisma.OutreachOutboundMessageGetPayload<Record<string, never>>;

function toRecord(row: Outbound): OutboundRecord {
  return {
    id: row.id,
    batchId: row.batchId,
    draftId: row.draftId,
    opportunityId: row.opportunityId,
    leadId: row.leadId,
    companyId: row.companyId,
    emailAccountId: row.emailAccountId,
    senderProfileId: row.senderProfileId,
    recipientEmail: row.recipientEmail,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyToEmail: row.replyToEmail,
    subject: row.subject,
    textBody: row.textBody,
    htmlBody: row.htmlBody,
    language: row.language,
    status: row.status,
    queuedAt: row.queuedAt,
    nextEligibleAt: row.nextEligibleAt,
    attemptCount: row.attemptCount,
    lastAttemptAt: row.lastAttemptAt,
    lockedUntil: row.lockedUntil,
    smtpSubmittedAt: row.smtpSubmittedAt,
    messageId: row.messageId,
    providerMessageId: row.providerMessageId,
    failureCode: row.failureCode,
    sentCopyStatus: row.sentCopyStatus,
    sentCopyAttempts: row.sentCopyAttempts,
    sentCopyError: row.sentCopyError,
    sentCopyAppendedAt: row.sentCopyAppendedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * DB-backed queue/idempotency store for outbound outreach messages. All
 * atomicity (one SMTP per draft version, one claim per due row, pacing) is
 * enforced here by unique/index constraints and compare-and-swap updates.
 * Owned by `outreach-sender`.
 */
@Injectable()
export class OutreachOutboundRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Insert an outbound; returns null when the draft already has one (unique). */
  async create(data: CreateOutboundData): Promise<OutboundRecord | null> {
    try {
      const row = await this.prisma.db.outreachOutboundMessage.create({
        data: { ...data, status: 'QUEUED' },
      });
      return toRecord(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  async findByDraftId(draftId: string): Promise<OutboundRecord | null> {
    const row = await this.prisma.db.outreachOutboundMessage.findUnique({
      where: { draftId },
    });
    return row ? toRecord(row) : null;
  }

  async findById(id: string): Promise<OutboundRecord | null> {
    const row = await this.prisma.db.outreachOutboundMessage.findUnique({
      where: { id },
    });
    return row ? toRecord(row) : null;
  }

  async listForBatch(batchId: string): Promise<OutboundRecord[]> {
    const rows = await this.prisma.db.outreachOutboundMessage.findMany({
      where: { batchId },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  /** Latest scheduled eligibility for a mailbox (for pacing when queueing). */
  async latestScheduledForAccount(
    emailAccountId: string,
  ): Promise<Date | null> {
    const row = await this.prisma.db.outreachOutboundMessage.findFirst({
      where: {
        emailAccountId,
        status: { in: ['QUEUED', 'SENDING'] },
      },
      orderBy: { nextEligibleAt: 'desc' },
      select: { nextEligibleAt: true },
    });
    return row?.nextEligibleAt ?? null;
  }

  /**
   * Atomically claims up to `limit` due, unlocked QUEUED rows (CAS). The winner
   * of a lease transition is the only sender for that row.
   */
  async claimDue(
    now: Date,
    leaseMs: number,
    limit: number,
  ): Promise<OutboundRecord[]> {
    const candidates = await this.prisma.db.outreachOutboundMessage.findMany({
      where: {
        status: 'QUEUED',
        nextEligibleAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      orderBy: [{ nextEligibleAt: 'asc' }, { queuedAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    const lockedUntil = new Date(now.getTime() + leaseMs);
    const claimed: OutboundRecord[] = [];
    for (const candidate of candidates) {
      const result = await this.prisma.db.outreachOutboundMessage.updateMany({
        where: {
          id: candidate.id,
          status: 'QUEUED',
          OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        data: { status: 'SENDING', lockedUntil, lastAttemptAt: now },
      });
      if (result.count === 1) {
        claimed.push({
          ...toRecord(candidate),
          status: 'SENDING',
          lockedUntil,
          lastAttemptAt: now,
        });
      }
    }
    return claimed;
  }

  /** Releases a claim without sending (e.g. mailbox pacing or paused batch). */
  async release(id: string, nextEligibleAt?: Date): Promise<void> {
    await this.prisma.db.outreachOutboundMessage.updateMany({
      where: { id, status: 'SENDING' },
      data: {
        status: 'QUEUED',
        lockedUntil: null,
        ...(nextEligibleAt ? { nextEligibleAt } : {}),
      },
    });
  }

  async markSent(
    id: string,
    submittedAt: Date,
    providerMessageId: string | null,
  ): Promise<void> {
    await this.prisma.db.outreachOutboundMessage.update({
      where: { id },
      data: {
        status: 'SENT',
        smtpSubmittedAt: submittedAt,
        providerMessageId,
        lockedUntil: null,
        failureCode: null,
      },
    });
  }

  /** Records a transport failure and re-queues (retry-safe) or fails. */
  async markAttemptFailure(
    id: string,
    code: string,
    status: 'QUEUED' | 'FAILED',
    nextEligibleAt: Date,
  ): Promise<void> {
    await this.prisma.db.outreachOutboundMessage.update({
      where: { id },
      data: {
        status,
        failureCode: code,
        lockedUntil: null,
        nextEligibleAt,
        attemptCount: { increment: 1 },
      },
    });
  }

  async markSentCopy(
    id: string,
    status: OutreachSentCopyStatus,
    error: string | null,
  ): Promise<void> {
    await this.prisma.db.outreachOutboundMessage.update({
      where: { id },
      data: {
        sentCopyStatus: status,
        sentCopyError: error,
        sentCopyAttempts: { increment: 1 },
        ...(status === 'APPENDED' ? { sentCopyAppendedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Enforces per-mailbox pacing: any still-queued message for the mailbox that
   * is due before `to` is pushed out to `to`, so the next send can only happen
   * after the interval elapses.
   */
  async pushAccountSchedule(
    emailAccountId: string,
    to: Date,
  ): Promise<void> {
    await this.prisma.db.outreachOutboundMessage.updateMany({
      where: {
        emailAccountId,
        status: 'QUEUED',
        nextEligibleAt: { lt: to },
      },
      data: { nextEligibleAt: to },
    });
  }

    /** Cancels still-queued rows (never a leased SENDING row or a SENT one). */
  async cancelQueued(batchId: string): Promise<number> {
    const result = await this.prisma.db.outreachOutboundMessage.updateMany({
      where: { batchId, status: 'QUEUED' },
      data: { status: 'CANCELLED', lockedUntil: null },
    });
    return result.count;
  }

  async listSentCopyFailures(batchId: string): Promise<OutboundRecord[]> {    const rows = await this.prisma.db.outreachOutboundMessage.findMany({
      where: { batchId, status: 'SENT', sentCopyStatus: 'FAILED' },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async countByBatch(batchId: string): Promise<{
    queued: number;
    sending: number;
    sent: number;
    failed: number;
    cancelled: number;
    sentCopyFailures: number;
    nextScheduledAt: Date | null;
  }> {
    const [grouped, sentCopyFailures, next] = await Promise.all([
      this.prisma.db.outreachOutboundMessage.groupBy({
        by: ['status'],
        where: { batchId },
        _count: { _all: true },
      }),
      this.prisma.db.outreachOutboundMessage.count({
        where: { batchId, status: 'SENT', sentCopyStatus: 'FAILED' },
      }),
      this.prisma.db.outreachOutboundMessage.findFirst({
        where: { batchId, status: 'QUEUED' },
        orderBy: { nextEligibleAt: 'asc' },
        select: { nextEligibleAt: true },
      }),
    ]);
    const byStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
    return {
      queued: byStatus.get('QUEUED') ?? 0,
      sending: byStatus.get('SENDING') ?? 0,
      sent: byStatus.get('SENT') ?? 0,
      failed: byStatus.get('FAILED') ?? 0,
      cancelled: byStatus.get('CANCELLED') ?? 0,
      sentCopyFailures,
      nextScheduledAt: next?.nextEligibleAt ?? null,
    };
  }
}
