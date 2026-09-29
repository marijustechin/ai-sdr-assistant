import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type {
  CreateBatchData,
  OutreachBatchRecord,
} from '../domain/types.js';

const DRAFT_INCLUDE = {
  contact: true,
} satisfies Prisma.OutreachDraftInclude;

export type BatchDraftRow = Prisma.OutreachDraftGetPayload<{
  include: typeof DRAFT_INCLUDE;
}>;

type OutreachBatch = Awaited<
  ReturnType<PrismaService['db']['outreachBatch']['create']>
>;

function toBatchRecord(batch: OutreachBatch): OutreachBatchRecord {
  return {
    id: batch.id,
    opportunityId: batch.opportunityId,
    targetMarketId: batch.targetMarketId,
    senderProfileId: batch.senderProfileId,
    language: batch.language,
    status: batch.status,
    approvedByKind: batch.approvedByKind,
    approvedAt: batch.approvedAt,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

/**
 * Typed repository scoped to the batch/campaign review tables owned by
 * `outreach-drafter`: `outreach_batches` and the batch-related columns of
 * `outreach_drafts`. No transport.
 */
@Injectable()
export class OutreachBatchRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async createBatch(data: CreateBatchData): Promise<OutreachBatchRecord> {
    const batch = await this.prisma.db.outreachBatch.create({
      data: {
        opportunityId: data.opportunityId,
        targetMarketId: data.targetMarketId,
        senderProfileId: data.senderProfileId,
        language: data.language,
      },
    });
    return toBatchRecord(batch);
  }

  async findBatch(id: string): Promise<OutreachBatchRecord | null> {
    const batch = await this.prisma.db.outreachBatch.findUnique({
      where: { id },
    });
    return batch ? toBatchRecord(batch) : null;
  }

  async listBatches(opportunityId: string): Promise<OutreachBatchRecord[]> {
    const batches = await this.prisma.db.outreachBatch.findMany({
      where: { opportunityId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return batches.map(toBatchRecord);
  }

  async setStatus(
    id: string,
    status: OutreachBatchRecord['status'],
    approvedAt: Date | null,
  ): Promise<OutreachBatchRecord> {
    const batch = await this.prisma.db.outreachBatch.update({
      where: { id },
      data: { status, approvedAt },
    });
    return toBatchRecord(batch);
  }

  /** Groups the given draft versions under one batch (review grouping). */
  async attachDrafts(batchId: string, draftIds: string[]): Promise<void> {
    if (draftIds.length === 0) return;
    await this.prisma.db.outreachDraft.updateMany({
      where: { id: { in: draftIds } },
      data: { batchId },
    });
  }

  async listDraftRowsForBatch(batchId: string): Promise<BatchDraftRow[]> {
    return this.prisma.db.outreachDraft.findMany({
      where: { batchId },
      include: DRAFT_INCLUDE,
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Freezes approval for every prepared, still-pending draft in the batch
   * (per immutable version). Returns how many versions were approved.
   */
  async approvePendingDrafts(batchId: string): Promise<number> {
    const result = await this.prisma.db.outreachDraft.updateMany({
      where: {
        batchId,
        approvalStatus: 'PENDING',
        preparationStatus: 'PREPARED',
      },
      data: { approvalStatus: 'APPROVED', approvedAt: new Date() },
    });
    return result.count;
  }

  /** True when the batch has any draft still awaiting approval. */
  async countPendingDrafts(batchId: string): Promise<number> {
    return this.prisma.db.outreachDraft.count({
      where: { batchId, approvalStatus: 'PENDING' },
    });
  }
}
