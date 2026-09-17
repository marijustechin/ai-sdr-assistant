import type { OpportunityRead, ResearchRunSummary } from "./types";

export const NO_OPPORTUNITIES_MESSAGE =
  "No opportunity is recorded for this product yet.";

export const NO_RUNS_MESSAGE =
  "No research run has been recorded for this opportunity.";

export interface OpportunityRuns {
  opportunity: OpportunityRead;
  runs: ResearchRunSummary[];
}

/** Pairs each opportunity with its runs (empty array when it has none). */
export function buildOpportunityRuns(
  opportunities: OpportunityRead[],
  runsByOpportunityId: Map<string, ResearchRunSummary[]>,
): OpportunityRuns[] {
  return opportunities.map((opportunity) => ({
    opportunity,
    runs: runsByOpportunityId.get(opportunity.id) ?? [],
  }));
}

/** Message shown when an opportunity has no runs; null when it has runs. */
export function runsEmptyMessage(item: OpportunityRuns): string | null {
  return item.runs.length === 0 ? NO_RUNS_MESSAGE : null;
}

/** True when the product has no opportunities at all. */
export function hasNoOpportunities(opportunities: OpportunityRead[]): boolean {
  return opportunities.length === 0;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export function researchIndexPath(productId: string): string {
  return `/products/${enc(productId)}/research`;
}

export function researchRunPath(
  productId: string,
  opportunityId: string,
  runId: string,
): string {
  return `/products/${enc(productId)}/research/${enc(opportunityId)}/${enc(runId)}`;
}
