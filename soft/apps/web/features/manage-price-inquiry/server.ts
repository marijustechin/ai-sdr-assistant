import "server-only";
import type {
  CreatePriceInquiryDraftInput,
  UpdatePriceInquiryDraftInput,
} from "@ai-sdr/contracts";
import { apiRequest } from "@shared/api/client";
import type { PriceInquiryDraftRead } from "@entities/price-inquiry";
import type { QuoteCollectionItemRead } from "@entities/quote-collection";

interface CheckRepliesResult {
  scanned: number;
  persisted: number;
  skipped: number;
  matched: number;
  extracted: number;
  unmatched: number;
  items: QuoteCollectionItemRead[];
}

/**
 * Server-only reads/writes for price-inquiry drafts and the quote collection.
 * The internal API key never reaches the browser.
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

/** Explicit, confirmed human send of one reviewed RFQ (SMTP). */
export async function sendPriceInquiry(
  opportunityId: string,
  leadId: string,
  draftId: string,
): Promise<PriceInquiryDraftRead> {
  const result = await apiRequest<{ draft: PriceInquiryDraftRead }>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/price-inquiry-drafts/${enc(draftId)}/send`,
    { method: "POST", body: { confirm: true }, timeoutMs: 30000 },
  );
  return result.draft;
}

/** Human-triggered bounded IMAP reply check for one RFQ. */
export async function checkPriceInquiryReplies(
  opportunityId: string,
  leadId: string,
  draftId: string,
): Promise<CheckRepliesResult> {
  return apiRequest<CheckRepliesResult>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/price-inquiry-drafts/${enc(draftId)}/check-replies`,
    { method: "POST", timeoutMs: 30000 },
  );
}
