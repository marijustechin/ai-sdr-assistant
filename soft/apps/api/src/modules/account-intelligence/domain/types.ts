import type { BriefContent, CompanyBriefStatus } from '@ai-sdr/contracts';

export interface CompanyBriefRecord {
  id: string;
  opportunityId: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyBriefSnapshotRecord {
  id: string;
  briefId: string;
  version: number;
  status: CompanyBriefStatus;
  preparedAt: Date;
  lastRefreshedAt: Date;
  sourceCount: number;
  content: BriefContent;
  enrichmentNote: string | null;
  createdAt: Date;
}

export interface CompanyBriefSnapshotMeta {
  version: number;
  status: CompanyBriefStatus;
  preparedAt: Date;
  lastRefreshedAt: Date;
  sourceCount: number;
}

export interface CompanyBriefView {
  brief: CompanyBriefRecord;
  latest: CompanyBriefSnapshotRecord;
  history: CompanyBriefSnapshotMeta[];
}

export interface CreateBriefSnapshotData {
  briefId: string;
  version: number;
  status: CompanyBriefStatus;
  preparedAt: Date;
  lastRefreshedAt: Date;
  sourceCount: number;
  content: BriefContent;
  enrichmentNote: string | null;
}
