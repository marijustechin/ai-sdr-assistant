import "server-only";
import { apiRequest } from "@shared/api/client";
import type { OutreachDecisionRead, OutreachDraftRead } from "./types";

/**
 * Server-only reads for lead outreach drafts and the human outreach decision.
 * The internal API key is attached by `apiRequest`; it never reaches the
 * browser. There is no send path.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** GET .../leads/:leadId/outreach-drafts — prepared/blocked drafts (newest first). */
export async function listOutreachDrafts(
  opportunityId: string,
  leadId: string,
): Promise<OutreachDraftRead[]> {
  return apiRequest<OutreachDraftRead[]>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/outreach-drafts`,
    { method: "GET" },
  );
}

/** GET .../companies/:companyId/outreach-decision — the human decision, or null. */
export async function getOutreachDecisionForCompany(
  opportunityId: string,
  companyId: string,
): Promise<OutreachDecisionRead | null> {
  return apiRequest<OutreachDecisionRead | null>(
    `/opportunities/${enc(opportunityId)}/companies/${enc(companyId)}/outreach-decision`,
    { method: "GET" },
  );
}

/** GET .../research-offerings/:offeringId/outreach-decision — resolved company. */
export async function getOutreachDecisionForOffering(
  opportunityId: string,
  offeringId: string,
): Promise<OutreachDecisionRead | null> {
  return apiRequest<OutreachDecisionRead | null>(
    `/opportunities/${enc(opportunityId)}/research-offerings/${enc(offeringId)}/outreach-decision`,
    { method: "GET" },
  );
}
