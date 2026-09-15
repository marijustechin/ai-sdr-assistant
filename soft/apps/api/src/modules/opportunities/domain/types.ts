/**
 * Domain types for the opportunities module (no NestJS, Prisma, or HTTP
 * imports).
 */

export type TargetMarketStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type OpportunityStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface TargetMarketRecord {
  id: string;
  country: string;
  segment: string;
  lifecycleStatus: TargetMarketStatus;
}

export interface OpportunityRecord {
  id: string;
  offerId: string;
  name: string;
  objective: string | null;
  lifecycleStatus: OpportunityStatus;
  contextVersion: number;
}

export interface CreateTargetMarketData {
  country: string;
  segment: string;
  lifecycleStatus?: TargetMarketStatus;
}

export interface CreateOpportunityData {
  offerId: string;
  name: string;
  objective?: string;
  lifecycleStatus?: OpportunityStatus;
}

export interface OpportunityContextData {
  opportunity: OpportunityRecord;
  targetMarkets: TargetMarketRecord[];
}

/**
 * Opportunity plus its attached target markets, for product-scoped discovery
 * (`opportunities` owns both). Read-only; no new commercial rule.
 */
export interface OpportunityDiscoveryRecord extends OpportunityRecord {
  targetMarkets: TargetMarketRecord[];
}
