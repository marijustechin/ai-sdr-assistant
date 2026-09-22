import "server-only";
import { apiRequest } from "@shared/api/client";
import type { LeadRead, LeadReviewStatus } from "@/lib/leads/types";

/**
 * Server-only reads/writes for the potential-buyer shortlist. The internal API
 * key is attached by `apiRequest`; it never reaches the browser.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** GET /opportunities/:opportunityId/leads — candidates for one opportunity. */
export async function listOpportunityLeads(
  opportunityId: string,
): Promise<LeadRead[]> {
  return apiRequest<LeadRead[]>(
    `/opportunities/${enc(opportunityId)}/leads`,
    { method: "GET" },
  );
}

/** GET /opportunities/:opportunityId/leads/:leadId — one candidate. */
export async function getLead(
  opportunityId: string,
  leadId: string,
): Promise<LeadRead> {
  return apiRequest<LeadRead>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}`,
    { method: "GET" },
  );
}

/** PATCH /opportunities/:opportunityId/leads/:leadId — operator review action. */
export async function reviewLead(
  opportunityId: string,
  leadId: string,
  input: { reviewStatus: LeadReviewStatus; reviewReason?: string },
): Promise<LeadRead> {
  return apiRequest<LeadRead>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}`,
    { method: "PATCH", body: input },
  );
}
