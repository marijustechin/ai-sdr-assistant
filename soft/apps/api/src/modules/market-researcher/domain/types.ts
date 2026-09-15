/**
 * Domain types for the `market-researcher` module (no NestJS, Prisma, or HTTP
 * imports).
 */

export type ResearchRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ResearchRunPauseReason =
  | 'BUDGET_EXHAUSTED'
  | 'ACCESS_BLOCKED'
  | 'CONTEXT_CHANGED'
  | 'DIMINISHING_RETURNS'
  | 'NEEDS_HUMAN';

export type ResearchQueryStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED';

export interface ResearchRunRecord {
  id: string;
  opportunityId: string;
  status: ResearchRunStatus;
  contextVersion: number;
  requestedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorCode: string | null;
  errorNote: string | null;
  pauseReason: ResearchRunPauseReason | null;
  pauseNote: string | null;
  checkpoint: unknown;
  checkpointAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  targetMarketIds: string[];
}

export interface ResearchRunSummary {
  id: string;
  opportunityId: string;
  status: ResearchRunStatus;
  contextVersion: number;
  pauseReason: ResearchRunPauseReason | null;
  requestedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  checkpointAt: Date | null;
}

export interface ResearchQueryRecord {
  id: string;
  researchRunId: string;
  queryText: string;
  provider: string | null;
  status: ResearchQueryStatus;
  executedAt: Date | null;
  resultCount: number | null;
  errorCode: string | null;
  errorNote: string | null;
  createdAt: Date;
}

export interface CreateResearchRunData {
  opportunityId: string;
  contextVersion: number;
  targetMarketIds: string[];
}

export interface UpdateResearchRunData {
  status?: ResearchRunStatus;
  pauseReason?: ResearchRunPauseReason | null;
  pauseNote?: string | null;
  errorCode?: string | null;
  errorNote?: string | null;
  checkpoint?: unknown;
  contextVersion?: number;
}

export interface RecordResearchQueryData {
  researchRunId: string;
  queryText: string;
  provider?: string;
  status?: ResearchQueryStatus;
  executedAt?: Date;
  resultCount?: number;
  errorCode?: string;
  errorNote?: string;
}
