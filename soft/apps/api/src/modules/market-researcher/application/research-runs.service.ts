import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@ai-sdr/database';
import type {
  RecordResearchQueryInput,
  UpdateResearchRunInput,
} from '@ai-sdr/contracts';
import { OpportunitiesService } from '../../opportunities/application/opportunities.service.js';
import type {
  CreateQueuedResearchRunData,
  ResearchQueryRecord,
  ResearchRunRecord,
} from '../domain/types.js';
import { ResearchRunsRepository } from '../infrastructure/research-runs.repository.js';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'] as const;

/**
 * Application service for the `market-researcher` module. Owns the run envelope
 * (`research_runs`), the run scope join, and the run-scoped query log. It never
 * writes evidence/claims (`evidence` owns those).
 */
@Injectable()
export class MarketResearcherService {
  constructor(
    @Inject(ResearchRunsRepository)
    private readonly repository: ResearchRunsRepository,
    @Inject(OpportunitiesService)
    private readonly opportunities: OpportunitiesService,
  ) {}

  /**
   * Starts a run for an existing opportunity, capturing the opportunity's
   * current `contextVersion` and its attached target markets as the run scope.
   */
  async createRun(opportunityId: string): Promise<ResearchRunRecord> {
    const { opportunity, targetMarkets } =
      await this.opportunities.getContextData(opportunityId);
    // Canonical Research Context rule: `scope.targetMarketIds` must be
    // non-empty for a market-research task (research-context-contract.md §2).
    // No new commercial prerequisite is added.
    if (targetMarkets.length === 0) {
      throw new ConflictException({ error: 'research_scope_empty' });
    }
    return this.repository.createRun({
      opportunityId,
      contextVersion: opportunity.contextVersion,
      targetMarketIds: targetMarkets.map((market) => market.id),
    });
  }

  /**
   * Creates a `QUEUED` run from the product-independent request flow, persisting
   * the validated request parameters. Accepts a caller transaction so the
   * submission commits all related writes together.
   */
  async createQueuedRun(
    input: CreateQueuedResearchRunData,
    tx?: Prisma.TransactionClient,
  ): Promise<ResearchRunRecord> {
    return this.repository.createQueuedRun(input, tx);
  }

  /** Idempotency lookup for the request flow. */
  async findRunByRequestKey(
    requestKey: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResearchRunRecord | null> {
    return this.repository.findRunByRequestKey(requestKey, tx);
  }

  /** Discovery read: all runs awaiting a researcher (oldest first). */
  async listQueuedRuns(): Promise<ResearchRunRecord[]> {
    return this.repository.listQueuedRuns();
  }

  /** Run by id, without an opportunity path segment (intake read). */
  async getRunById(runId: string): Promise<ResearchRunRecord> {
    const run = await this.repository.findRun(runId);
    if (!run) {
      throw new NotFoundException({ error: 'research_run_not_found' });
    }
    return run;
  }

  async listRuns(opportunityId: string) {
    // Validates the opportunity exists (404 otherwise).
    await this.opportunities.getContextData(opportunityId);
    return this.repository.listRunsForOpportunity(opportunityId);
  }

  /**
   * Read-only run counts for the admin dashboard: total runs and how many are
   * `COMPLETED`. No coverage or success rate is inferred.
   */
  async countRuns(): Promise<{ total: number; completed: number }> {
    const counts = await this.repository.countRunsByStatus();
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { total, completed: counts.COMPLETED };
  }

  /** The resume read: run envelope + scope + lifecycle/pause + queries. */
  async getRun(
    opportunityId: string,
    runId: string,
  ): Promise<ResearchRunRecord & { queries: ResearchQueryRecord[] }> {
    const run = await this.findRunOrThrow(opportunityId, runId);
    const queries = await this.repository.listQueries(runId);
    return { ...run, queries };
  }

  /**
   * Applies a lifecycle-only update. `PAUSED` + `pauseReason` stays distinct
   * from `FAILED` + `errorCode`. Resuming checks the recorded `contextVersion`
   * against the opportunity's current one and blocks (does not silently rebase)
   * on a mismatch.
   */
  async updateRun(
    opportunityId: string,
    runId: string,
    input: UpdateResearchRunInput,
  ): Promise<ResearchRunRecord> {
    const run = await this.findRunOrThrow(opportunityId, runId);
    const { opportunity } = await this.opportunities.getContextData(
      opportunityId,
    );

    if (
      input.status !== undefined &&
      TERMINAL_STATUSES.includes(
        run.status as (typeof TERMINAL_STATUSES)[number],
      ) &&
      input.status !== run.status
    ) {
      throw new ConflictException({ error: 'run_terminal' });
    }

    if (input.contextVersion !== undefined) {
      if (input.contextVersion !== opportunity.contextVersion) {
        throw new BadRequestException({
          error: 'context_version_mismatch',
          opportunityContextVersion: opportunity.contextVersion,
        });
      }
    }

    if (input.status === 'RUNNING') {
      const currentVersion = opportunity.contextVersion;
      const acknowledged = input.contextVersion !== undefined;
      if (!acknowledged && run.contextVersion !== currentVersion) {
        await this.repository.updateRun(runId, {
          status: 'PAUSED',
          pauseReason: 'CONTEXT_CHANGED',
          pauseNote: `context changed from v${run.contextVersion} to v${currentVersion}`,
        });
        throw new ConflictException({
          error: 'context_changed',
          runContextVersion: run.contextVersion,
          opportunityContextVersion: currentVersion,
        });
      }
    }

    if (input.status === 'RUNNING' && run.status === 'QUEUED') {
      // Claiming a queued request is a compare-and-swap: exactly one execution
      // attempt can move QUEUED -> RUNNING; a concurrent loser is rejected.
      const claimed = await this.repository.claimQueuedRun(runId);
      if (!claimed) {
        throw new ConflictException({ error: 'run_not_claimable' });
      }
      return this.getRunById(runId);
    }

    if (input.status === 'RUNNING' && run.status === 'RUNNING') {
      // The run is already claimed/started; a second execution attempt must not
      // succeed. (Resuming a PAUSED run is a different, allowed transition.)
      throw new ConflictException({ error: 'run_already_running' });
    }

    return this.repository.updateRun(runId, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.status === 'RUNNING'
        ? { pauseReason: null, pauseNote: null }
        : input.status === 'PAUSED'
          ? {
              pauseReason: input.pauseReason,
              pauseNote: input.pauseNote ?? null,
            }
          : {}),
      ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
      ...(input.errorNote !== undefined ? { errorNote: input.errorNote } : {}),
      ...(input.checkpoint !== undefined
        ? { checkpoint: input.checkpoint }
        : {}),
      ...(input.contextVersion !== undefined
        ? { contextVersion: input.contextVersion }
        : {}),
    });
  }

  async recordQuery(
    opportunityId: string,
    runId: string,
    input: RecordResearchQueryInput,
  ): Promise<ResearchQueryRecord> {
    await this.findRunOrThrow(opportunityId, runId);
    return this.repository.recordQuery({
      researchRunId: runId,
      queryText: input.queryText,
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.executedAt !== undefined
        ? { executedAt: input.executedAt }
        : {}),
      ...(input.resultCount !== undefined
        ? { resultCount: input.resultCount }
        : {}),
      ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
      ...(input.errorNote !== undefined ? { errorNote: input.errorNote } : {}),
    });
  }

  async listQueries(
    opportunityId: string,
    runId: string,
  ): Promise<ResearchQueryRecord[]> {
    await this.findRunOrThrow(opportunityId, runId);
    return this.repository.listQueries(runId);
  }

  /** Used by the `evidence` module to authorise run-scoped writes/reads. */
  async assertRun(opportunityId: string, runId: string): Promise<void> {
    await this.findRunOrThrow(opportunityId, runId);
  }

  private async findRunOrThrow(
    opportunityId: string,
    runId: string,
  ): Promise<ResearchRunRecord> {
    const run = await this.repository.findRun(runId);
    if (!run || run.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'research_run_not_found' });
    }
    return run;
  }
}
