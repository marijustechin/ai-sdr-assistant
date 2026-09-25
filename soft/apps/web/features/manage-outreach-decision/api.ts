import "server-only";
import { apiRequest } from "@shared/api/client";
import type { SetOutreachDecisionInput } from "@ai-sdr/contracts";
import type { OutreachDecisionRead } from "@entities/outreach-draft";

/** Server-only writes for human outreach decisions (internal key stays server-side). */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function setOutreachDecisionForCompany(
  opportunityId: string,
  companyId: string,
  input: SetOutreachDecisionInput,
): Promise<OutreachDecisionRead> {
  return apiRequest<OutreachDecisionRead>(
    `/opportunities/${enc(opportunityId)}/companies/${enc(companyId)}/outreach-decision`,
    { method: "PUT", body: input },
  );
}

export async function setOutreachDecisionForOffering(
  opportunityId: string,
  offeringId: string,
  input: SetOutreachDecisionInput,
): Promise<OutreachDecisionRead> {
  return apiRequest<OutreachDecisionRead>(
    `/opportunities/${enc(opportunityId)}/research-offerings/${enc(offeringId)}/outreach-decision`,
    { method: "PUT", body: input },
  );
}
