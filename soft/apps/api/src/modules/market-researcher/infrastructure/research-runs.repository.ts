import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  type ResearchQuery,
  type ResearchRun,
} from '@ai-sdr/database';
import type {
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

  async findRun(runId: string): Promise<ResearchRunRecord | null> {
    const run = await this.prisma.db.researchRun.findUnique({
      where: { id: runId },
      include: RUN_INCLUDE,
    });
    return run ? toRunRecord(run) : null;
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
