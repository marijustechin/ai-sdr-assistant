import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type {
  CreateTestDeliveryData,
  OutreachSentCopyStatus,
  TestDeliveryRecord,
} from '../domain/types.js';

type TestDelivery = Prisma.OutreachTestDeliveryGetPayload<Record<string, never>>;

function toRecord(row: TestDelivery): TestDeliveryRecord {
  return {
    id: row.id,
    batchId: row.batchId,
    draftId: row.draftId,
    opportunityId: row.opportunityId,
    leadId: row.leadId,
    emailAccountId: row.emailAccountId,
    senderProfileId: row.senderProfileId,
    originalRecipient: row.originalRecipient,
    testRecipient: row.testRecipient,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyToEmail: row.replyToEmail,
    subject: row.subject,
    subjectPrefixed: row.subjectPrefixed,
    language: row.language,
    status: row.status,
    messageId: row.messageId,
    providerMessageId: row.providerMessageId,
    failureCode: row.failureCode,
    smtpSubmittedAt: row.smtpSubmittedAt,
    sentCopyStatus: row.sentCopyStatus,
    sentCopyAttempts: row.sentCopyAttempts,
    sentCopyError: row.sentCopyError,
    sentCopyAppendedAt: row.sentCopyAppendedAt,
    rawMessage: row.rawMessage ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Append-only store for **test** outreach deliveries, owned by `outreach-sender`.
 * Test deliveries are kept entirely separate from `outreach_outbound_messages`
 * (the production queue): they advance no production state, consume no pacing,
 * and never mark a real recipient as contacted. There is no queue and no claim —
 * a test always sends only on an explicit human action.
 */
@Injectable()
export class OutreachTestDeliveryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateTestDeliveryData): Promise<TestDeliveryRecord> {
    const row = await this.prisma.db.outreachTestDelivery.create({
      data: { ...data, rawMessage: data.rawMessage ?? null },
    });
    return toRecord(row);
  }

  async listForBatch(
    batchId: string,
    limit = 25,
  ): Promise<TestDeliveryRecord[]> {
    const rows = await this.prisma.db.outreachTestDelivery.findMany({
      where: { batchId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  /** SENT test copies whose Sent-folder append failed (retry never re-SMTPs). */
  async listSentCopyFailures(batchId: string): Promise<TestDeliveryRecord[]> {
    const rows = await this.prisma.db.outreachTestDelivery.findMany({
      where: { batchId, status: 'SENT', sentCopyStatus: 'FAILED' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async markSentCopy(
    id: string,
    status: OutreachSentCopyStatus,
    error: string | null,
  ): Promise<void> {
    await this.prisma.db.outreachTestDelivery.update({
      where: { id },
      data: {
        sentCopyStatus: status,
        sentCopyError: error,
        sentCopyAttempts: { increment: 1 },
        ...(status === 'APPENDED' ? { sentCopyAppendedAt: new Date() } : {}),
      },
    });
  }
}
