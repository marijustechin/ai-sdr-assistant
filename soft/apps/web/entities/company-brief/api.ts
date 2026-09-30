import "server-only";
import { apiRequest } from "@shared/api/client";
import type { CompanyBriefViewRead } from "./types";

/** Server-only read for a company brief (account intelligence). */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function getCompanyBrief(
  opportunityId: string,
  companyId: string,
): Promise<CompanyBriefViewRead> {
  return apiRequest<CompanyBriefViewRead>(
    `/opportunities/${enc(opportunityId)}/companies/${enc(companyId)}/brief`,
    { method: "GET" },
  );
}
