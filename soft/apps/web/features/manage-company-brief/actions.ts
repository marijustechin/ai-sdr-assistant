"use server";

import { revalidatePath } from "next/cache";
import {
  prepareCompanyBrief,
  refreshCompanyBrief,
  requestCompanyBriefEnrichment,
} from "./api";

function revalidate(productId: string): void {
  revalidatePath(`/products/${encodeURIComponent(productId)}/leads`);
}

/** Compiles the Stage-1 company brief from persisted platform intelligence. */
export async function prepareCompanyBriefAction(
  opportunityId: string,
  companyId: string,
  productId: string,
): Promise<void> {
  await prepareCompanyBrief(opportunityId, companyId);
  revalidate(productId);
}

/** Recompiles the brief into a fresh snapshot (history preserved). */
export async function refreshCompanyBriefAction(
  opportunityId: string,
  companyId: string,
  productId: string,
): Promise<void> {
  await refreshCompanyBrief(opportunityId, companyId);
  revalidate(productId);
}

/** Requests a targeted enrichment (the research harness submits findings). */
export async function requestCompanyBriefEnrichmentAction(
  opportunityId: string,
  companyId: string,
  productId: string,
): Promise<void> {
  await requestCompanyBriefEnrichment(opportunityId, companyId);
  revalidate(productId);
}
