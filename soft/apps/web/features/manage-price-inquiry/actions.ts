"use server";

import { revalidatePath } from "next/cache";
import {
  CreatePriceInquiryDraftSchema,
  UpdatePriceInquiryDraftSchema,
} from "@ai-sdr/contracts";
import { describeApiError } from "@shared/api/errors";
import type {
  CheckRepliesActionResult,
  PriceInquiryActionResult,
  SendPriceInquiryActionResult,
} from "@entities/price-inquiry";
import {
  checkPriceInquiryReplies,
  createPriceInquiryDraft,
  sendPriceInquiry,
  updatePriceInquiryDraft,
} from "./server";

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

function revalidateLead(
  productId: string,
  opportunityId: string,
  leadId: string,
): void {
  revalidatePath(`/products/${productId}/leads/${opportunityId}/${leadId}`);
}

export async function createPriceInquiryDraftAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  values: unknown,
): Promise<PriceInquiryActionResult> {
  if (!productId || !opportunityId || !leadId) {
    return { ok: false, message: "Missing opportunity context." };
  }
  const parsed = CreatePriceInquiryDraftSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  try {
    const draft = await createPriceInquiryDraft(opportunityId, leadId, {
      ...parsed.data,
      productId,
    });
    revalidateLead(productId, opportunityId, leadId);
    return { ok: true, draft };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The price inquiry draft could not be created.",
      ),
    };
  }
}

export async function updatePriceInquiryDraftAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  draftId: string,
  values: unknown,
): Promise<PriceInquiryActionResult> {
  if (!productId || !opportunityId || !leadId || !draftId) {
    return { ok: false, message: "Missing draft context." };
  }
  const parsed = UpdatePriceInquiryDraftSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  try {
    const draft = await updatePriceInquiryDraft(
      opportunityId,
      leadId,
      draftId,
      parsed.data,
    );
    revalidateLead(productId, opportunityId, leadId);
    return { ok: true, draft };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The price inquiry draft could not be saved.",
      ),
    };
  }
}

/**
 * Explicit, confirmed send of one reviewed RFQ from its inquiry sender. This is
 * a market-research action, never buyer outreach.
 */
export async function sendPriceInquiryAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  draftId: string,
  confirm: boolean,
): Promise<SendPriceInquiryActionResult> {
  if (!productId || !opportunityId || !leadId || !draftId) {
    return { ok: false, message: "Missing draft context." };
  }
  if (!confirm) {
    return { ok: false, message: "Confirm the send to continue." };
  }
  try {
    const draft = await sendPriceInquiry(opportunityId, leadId, draftId);
    revalidateLead(productId, opportunityId, leadId);
    return {
      ok: true,
      draft,
      message: "Submitted to outgoing SMTP server.",
    };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The price inquiry could not be sent.",
      ),
    };
  }
}

/** Human-triggered bounded reply check for one RFQ (scan only; never automatic). */
export async function checkPriceInquiryRepliesAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  draftId: string,
): Promise<CheckRepliesActionResult> {
  if (!productId || !opportunityId || !leadId || !draftId) {
    return { ok: false, message: "Missing draft context." };
  }
  try {
    const result = await checkPriceInquiryReplies(
      opportunityId,
      leadId,
      draftId,
    );
    revalidateLead(productId, opportunityId, leadId);
    return {
      ok: true,
      scanned: result.scanned,
      persisted: result.persisted,
      matched: result.matched,
      extracted: result.extracted,
      unmatched: result.unmatched,
      skipped: result.skipped,
      message:
        result.extracted > 0
          ? `Quote extracted from ${result.extracted} reply(ies).`
          : result.matched > 0
            ? `Reply received (${result.matched}); no structured quote extracted yet.`
            : `No matching reply found (scanned ${result.scanned}).`,
    };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The mailbox could not be checked."),
    };
  }
}
