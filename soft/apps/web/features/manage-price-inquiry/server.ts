import "server-only";
import type {
  CreatePriceInquiryDraftInput,
  UpdatePriceInquiryDraftInput,
} from "@ai-sdr/contracts";
import { apiRequest } from "@shared/api/client";
import type { PriceInquiryDraftRead } from "@entities/price-inquiry";

/**
 * Server-only reads/writes for price-inquiry drafts. The internal API key never
 * reaches the browser. No transport is invoked by any of these calls.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function createPriceInquiryDraft(
  opportunityId: string,
  leadId: string,
  input: CreatePriceInquiryDraftInput,
): Promise<PriceInquiryDraftRead> {
  return apiRequest<PriceInquiryDraftRead>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/price-inquiry-drafts`,
    { method: "POST", body: input },
  );
}

export async function updatePriceInquiryDraft(
  opportunityId: string,
  leadId: string,
  draftId: string,
  input: UpdatePriceInquiryDraftInput,
): Promise<PriceInquiryDraftRead> {
  return apiRequest<PriceInquiryDraftRead>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/price-inquiry-drafts/${enc(draftId)}`,
    { method: "PATCH", body: input },
  );
}
