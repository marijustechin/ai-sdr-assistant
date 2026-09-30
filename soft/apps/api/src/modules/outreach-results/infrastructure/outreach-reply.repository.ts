import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type {
  CreateReplyData,
  OutreachReplyRecord,
} from '../domain/types.js';

type Reply = Prisma.OutreachReplyGetPayload<Record<string, never>>;

function toRecord(row: Reply): OutreachReplyRecord {
  return {
    id: row.id,
    batchId: row.batchId,
    outboundMessageId: row.outboundMessageId,
    opportunityId: row.opportunityId,
    leadId: row.leadId,
    companyId: row.companyId,
    draftId: row.draftId,
    emailAccountId: row.emailAccountId,
    mailboxUid: row.mailboxUid,
    providerMessageId: row.providerMessageId,
    inReplyTo: row.inReplyTo,
    references: row.references,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    subject: row.subject,
    bodyText: row.bodyText,
    receivedAt: row.receivedAt,
    classification: row.classification,
    classificationSource: row.classificationSource,
    classificationReason: row.classificationReason,
    handoffState: row.handoffState,
    excerpt: row.excerpt,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Repository scoped to `outreach_replies` (owned by `outreach-results`). Inbound
 * replies are append-only; `(email_account_id, mailbox_uid)` makes re-scans
 * idempotent.
 */
@Injectable()
export class OutreachReplyRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateReplyData): Promise<OutreachReplyRecord | null> {
    try {
      const row = await this.prisma.db.outreachReply.create({ data });
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

  async findByMailboxUid(
    emailAccountId: string,
    mailboxUid: string,
  ): Promise<OutreachReplyRecord | null> {
    const row = await this.prisma.db.outreachReply.findUnique({
      where: { emailAccountId_mailboxUid: { emailAccountId, mailboxUid } },
    });
    return row ? toRecord(row) : null;
  }

  async listForBatch(batchId: string): Promise<OutreachReplyRecord[]> {
    const rows = await this.prisma.db.outreachReply.findMany({
      where: { batchId },
      orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<OutreachReplyRecord | null> {
    const row = await this.prisma.db.outreachReply.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async updateClassification(
    id: string,
    data: {
      classification: OutreachReplyRecord['classification'];
      classificationSource: OutreachReplyRecord['classificationSource'];
      classificationReason: string | null;
      handoffState: OutreachReplyRecord['handoffState'];
      notes: string | null;
    },
  ): Promise<OutreachReplyRecord> {
    const row = await this.prisma.db.outreachReply.update({
      where: { id },
      data,
    });
    return toRecord(row);
  }
}
