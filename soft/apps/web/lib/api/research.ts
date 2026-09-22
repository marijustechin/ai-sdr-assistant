import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  ClaimRead,
  EvidenceRead,
  OfferRead,
  OfferingRead,
  OpportunityRead,
  ResearchRunDetail,
  ResearchRunSummary,
} from "@/lib/research/types";

/**
 * Server-only reads for the research-results dashboard. The internal API key is
 * attached by `apiRequest`; it never reaches the browser. All calls are
 * read-only — the dashboard has no write path for business data.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** GET /products/:productId/offers — used only to label offers by name. */
export async function listProductOffers(
  productId: string,
): Promise<OfferRead[]> {
  return apiRequest<OfferRead[]>(`/products/${enc(productId)}/offers`, {
    method: "GET",
  });
}

/** GET /products/:productId/opportunities — opportunities + attached markets. */
export async function listProductOpportunities(
  productId: string,
): Promise<OpportunityRead[]> {
  return apiRequest<OpportunityRead[]>(
    `/products/${enc(productId)}/opportunities`,
    { method: "GET" },
  );
}

/** GET /opportunities/:id/research-runs — run summaries (no checkpoint). */
export async function listOpportunityRuns(
  opportunityId: string,
): Promise<ResearchRunSummary[]> {
  return apiRequest<ResearchRunSummary[]>(
    `/opportunities/${enc(opportunityId)}/research-runs`,
    { method: "GET" },
  );
}

/** GET .../:runId — run detail (scope, checkpoint, queries). */
export async function getResearchRun(
  opportunityId: string,
  runId: string,
): Promise<ResearchRunDetail> {
  return apiRequest<ResearchRunDetail>(
    `/opportunities/${enc(opportunityId)}/research-runs/${enc(runId)}`,
    { method: "GET" },
  );
}

/** GET .../:runId/evidence — run-scoped evidence with its source. */
export async function listRunEvidence(
  opportunityId: string,
  runId: string,
): Promise<EvidenceRead[]> {
  return apiRequest<EvidenceRead[]>(
    `/opportunities/${enc(opportunityId)}/research-runs/${enc(runId)}/evidence`,
    { method: "GET" },
  );
}

/**
 * GET .../:runId/claims — CURRENT claims by default; pass `includeHistory` for
 * retracted/replaced claims (the explicit history view).
 */
export async function listRunClaims(
  opportunityId: string,
  runId: string,
  options: { includeHistory?: boolean } = {},
): Promise<ClaimRead[]> {
  const suffix = options.includeHistory ? "?includeHistory=true" : "";
  return apiRequest<ClaimRead[]>(
    `/opportunities/${enc(opportunityId)}/research-runs/${enc(runId)}/claims${suffix}`,
    { method: "GET" },
  );
}

/** GET .../:runId/offerings — structured, evidence-linked company offerings. */
export async function listRunOfferings(
  opportunityId: string,
  runId: string,
): Promise<OfferingRead[]> {
  return apiRequest<OfferingRead[]>(
    `/opportunities/${enc(opportunityId)}/research-runs/${enc(runId)}/offerings`,
    { method: "GET" },
  );
}
