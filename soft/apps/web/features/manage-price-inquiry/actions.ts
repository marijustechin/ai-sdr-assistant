"use server";

import { revalidatePath } from "next/cache";
import {
  CreatePriceInquiryDraftSchema,
  UpdatePriceInquiryDraftSchema,
} from "@ai-sdr/contracts";
import { describeApiError } from "@shared/api/errors";
import type { PriceInquiryActionResult } from "@entities/price-inquiry";
import {
  createPriceInquiryDraft,
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
