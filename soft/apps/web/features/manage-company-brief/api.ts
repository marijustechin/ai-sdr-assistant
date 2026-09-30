import "server-only";
import { apiRequest } from "@shared/api/client";
import type { CompanyBriefViewRead } from "@entities/company-brief";

function enc(value: string): string {
  return encodeURIComponent(value);
}

function base(opportunityId: string, companyId: string): string {
  return `/opportunities/${enc(opportunityId)}/companies/${enc(companyId)}/brief`;
}

/** Stage 1: compile a brief from persisted platform intelligence. */
export async function prepareCompanyBrief(
  opportunityId: string,
  companyId: string,
): Promise<CompanyBriefViewRead> {
  return apiRequest<CompanyBriefViewRead>(base(opportunityId, companyId), {
    method: "POST",
  });
}

/** Recompile the brief into a fresh snapshot (previous snapshots preserved). */
export async function refreshCompanyBrief(
  opportunityId: string,
  companyId: string,
): Promise<CompanyBriefViewRead> {
  return apiRequest<CompanyBriefViewRead>(`${base(opportunityId, companyId)}/refresh`, {
    method: "POST",
  });
}

/** Human action: request a targeted public-data enrichment (harness-run). */
export async function requestCompanyBriefEnrichment(
  opportunityId: string,
  companyId: string,
): Promise<CompanyBriefViewRead> {
  return apiRequest<CompanyBriefViewRead>(
    `${base(opportunityId, companyId)}/request-enrichment`,
    { method: "POST", body: {} },
  );
}
