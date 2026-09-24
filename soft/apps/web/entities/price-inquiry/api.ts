import "server-only";
import { apiRequest } from "@shared/api/client";
import type { PriceInquiryDraftRead } from "./types";

/** Server-only reads for price-inquiry (RFQ) drafts. */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function listPriceInquiryDrafts(
  opportunityId: string,
  leadId: string,
): Promise<PriceInquiryDraftRead[]> {
  return apiRequest<PriceInquiryDraftRead[]>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/price-inquiry-drafts`,
    { method: "GET" },
  );
}

export async function getPriceInquiryDraft(
  opportunityId: string,
  leadId: string,
  draftId: string,
): Promise<PriceInquiryDraftRead> {
  return apiRequest<PriceInquiryDraftRead>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/price-inquiry-drafts/${enc(draftId)}`,
    { method: "GET" },
  );
}
