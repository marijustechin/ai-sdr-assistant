import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  type ResearchQuery,
  type ResearchRun,
} from '@ai-sdr/database';
import type {
  CreateQueuedResearchRunData,
  CreateResearchRunData,
  RecordResearchQueryData,
  ResearchQueryRecord,
  ResearchRunRecord,
  ResearchRunSummary,
  UpdateResearchRunData,
} from '../domain/types.js';

type DbClient = Prisma.TransactionClient;
type RunWithScope = ResearchRun & {
  targetMarkets: Array<{ targetMarketId: string }>;
};

const RUN_INCLUDE = {
  targetMarkets: { select: { targetMarketId: true } },
} satisfies Prisma.ResearchRunInclude;

function toRunRecord(run: RunWithScope): ResearchRunRecord {
  return {
    id: run.id,
    opportunityId: run.opportunityId,
    status: run.status,
    contextVersion: run.contextVersion,
    requestedAt: run.requestedAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    errorCode: run.errorCode,
    errorNote: run.errorNote,
    pauseReason: run.pauseReason,
    pauseNote: run.pauseNote,
    checkpoint: run.checkpoint,
    checkpointAt: run.checkpointAt,
    requestParameters: run.requestParameters ?? null,
    requestKey: run.requestKey,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    targetMarketIds: run.targetMarkets.map((scope) => scope.targetMarketId),
  };
}

function toRunSummary(run: ResearchRun): ResearchRunSummary {
  return {
    id: run.id,
    opportunityId: run.opportunityId,
    status: run.status,
    contextVersion: run.contextVersion,
    pauseReason: run.pauseReason,
    requestedAt: run.requestedAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    checkpointAt: run.checkpointAt,
  };
}

function toQueryRecord(query: ResearchQuery): ResearchQueryRecord {
  return {
    id: query.id,
    researchRunId: query.researchRunId,
    queryText: query.queryText,
    provider: query.provider,
    status: query.status,
    executedAt: query.executedAt,
    resultCount: query.resultCount,
    errorCode: query.errorCode,
    errorNote: query.errorNote,
    createdAt: query.createdAt,
  };
}

/**
 * Typed repository scoped to the tables owned by `market-researcher`:
 * `research_runs`, `research_run_target_markets`, `research_queries`.
 */
@Injectable()
export class ResearchRunsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private client(tx?: DbClient): DbClient {
    return tx ?? this.prisma.db;
  }

  runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.prisma.db.$transaction(fn);
  }

  async createRun(data: CreateResearchRunData): Promise<ResearchRunRecord> {
    const run = await this.prisma.db.researchRun.create({
      data: {
        opportunityId: data.opportunityId,
        contextVersion: data.contextVersion,
        status: 'RUNNING',
        startedAt: new Date(),
        targetMarkets: {
          create: data.targetMarketIds.map((targetMarketId) => ({
            targetMarketId,
          })),
        },
      },
      include: RUN_INCLUDE,
    });
    return toRunRecord(run);
  }

  /**
   * Creates a `QUEUED` run from the product-independent request flow. Unlike
   * `createRun` (which starts a run immediately), this leaves the run waiting for
   * the researcher to claim, and persists the validated request parameters.
   */
  async createQueuedRun(
    data: CreateQueuedResearchRunData,
    tx?: DbClient,
  ): Promise<ResearchRunRecord> {
    const run = await this.client(tx).researchRun.create({
      data: {
        opportunityId: data.opportunityId,
        contextVersion: data.contextVersion,
        status: 'QUEUED',
        requestParameters: data.requestParameters as Prisma.InputJsonValue,
        ...(data.requestKey !== undefined ? { requestKey: data.requestKey } : {}),
        targetMarkets: {
          create: data.targetMarketIds.map((targetMarketId) => ({
            targetMarketId,
          })),
        },
      },
      include: RUN_INCLUDE,
    });
    return toRunRecord(run);
  }

  async findRun(
    runId: string,
    tx?: DbClient,
  ): Promise<ResearchRunRecord | null> {
    const run = await this.client(tx).researchRun.findUnique({
      where: { id: runId },
      include: RUN_INCLUDE,
    });
    return run ? toRunRecord(run) : null;
  }

  /** Idempotency lookup: a repeat submission returns its already-created run. */
  async findRunByRequestKey(
    requestKey: string,
    tx?: DbClient,
  ): Promise<ResearchRunRecord | null> {
    const run = await this.client(tx).researchRun.findUnique({
      where: { requestKey },
      include: RUN_INCLUDE,
    });
    return run ? toRunRecord(run) : null;
  }

  /** Runs awaiting a researcher, oldest first (discovery order). */
  async listQueuedRuns(tx?: DbClient): Promise<ResearchRunRecord[]> {
    const runs = await this.client(tx).researchRun.findMany({
      where: { status: 'QUEUED' },
      include: RUN_INCLUDE,
      orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    });
    return runs.map(toRunRecord);
  }

  /**
   * Compare-and-swap claim: moves a run `QUEUED → RUNNING` exactly once. Returns
   * `false` when another attempt already claimed it (or it was not queued).
   */
  async claimQueuedRun(runId: string, tx?: DbClient): Promise<boolean> {
    const result = await this.client(tx).researchRun.updateMany({
      where: { id: runId, status: 'QUEUED' },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    return result.count === 1;
  }

  async listRunsForOpportunity(
    opportunityId: string,
  ): Promise<ResearchRunSummary[]> {
    const runs = await this.prisma.db.researchRun.findMany({
      where: { opportunityId },
      orderBy: { requestedAt: 'desc' },
    });
    return runs.map(toRunSummary);
  }

  /**
   * Run counts per lifecycle status (read-only dashboard aggregation). Only
   * statuses that exist are returned.
   */
  async countRunsByStatus(): Promise<Record<ResearchRun['status'], number>> {
    const grouped = await this.prisma.db.researchRun.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts = {
      QUEUED: 0,
      RUNNING: 0,
      PAUSED: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    } satisfies Record<ResearchRun['status'], number>;
    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }
    return counts;
  }

  async updateRun(
    runId: string,
    data: UpdateResearchRunData,
  ): Promise<ResearchRunRecord> {
    const update: Prisma.ResearchRunUpdateInput = {};
    if (data.status !== undefined) {
      update.status = data.status;
      if (
        data.status === 'COMPLETED' ||
        data.status === 'FAILED' ||
        data.status === 'CANCELLED'
      ) {
        update.finishedAt = new Date();
      }
    }
    if (data.pauseReason !== undefined) update.pauseReason = data.pauseReason;
    if (data.pauseNote !== undefined) update.pauseNote = data.pauseNote;
    if (data.errorCode !== undefined) update.errorCode = data.errorCode;
    if (data.errorNote !== undefined) update.errorNote = data.errorNote;
    if (data.checkpoint !== undefined) {
      update.checkpoint = data.checkpoint as Prisma.InputJsonValue;
      update.checkpointAt = new Date();
    }
    if (data.contextVersion !== undefined) {
      update.contextVersion = data.contextVersion;
    }

    const run = await this.prisma.db.researchRun.update({
      where: { id: runId },
      data: update,
      include: RUN_INCLUDE,
    });
    return toRunRecord(run);
  }

  async recordQuery(
    data: RecordResearchQueryData,
  ): Promise<ResearchQueryRecord> {
    const query = await this.prisma.db.researchQuery.create({
      data: {
        researchRunId: data.researchRunId,
        queryText: data.queryText,
        ...(data.provider !== undefined ? { provider: data.provider } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.executedAt !== undefined
          ? { executedAt: data.executedAt }
          : {}),
        ...(data.resultCount !== undefined
          ? { resultCount: data.resultCount }
          : {}),
        ...(data.errorCode !== undefined ? { errorCode: data.errorCode } : {}),
        ...(data.errorNote !== undefined ? { errorNote: data.errorNote } : {}),
      },
    });
    return toQueryRecord(query);
  }

  async listQueries(researchRunId: string): Promise<ResearchQueryRecord[]> {
    const queries = await this.prisma.db.researchQuery.findMany({
      where: { researchRunId },
      orderBy: { createdAt: 'asc' },
    });
    return queries.map(toQueryRecord);
  }
}
