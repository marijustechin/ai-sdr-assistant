import "server-only";
import { apiRequest } from "@shared/api/client";
import type { CompanyBriefDetailRead, CompanyBriefViewRead } from "./types";

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

/** Read a brief by id (dedicated brief page). */
export async function getCompanyBriefById(
  briefId: string,
): Promise<CompanyBriefDetailRead> {
  return apiRequest<CompanyBriefDetailRead>(
    `/company-briefs/${enc(briefId)}`,
    { method: "GET" },
  );
}
