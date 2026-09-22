"use server";

import { revalidatePath } from "next/cache";
import { UpdateLeadReviewSchema } from "@ai-sdr/contracts";
import { reviewLead } from "./leads";
import { describeApiError } from "@shared/api/errors";
import type { LeadReviewActionResult } from "@/lib/leads/types";

/**
 * Record an operator review action on a candidate (shortlist / reject / reset).
 * Runs on the server so the `x-internal-api-key` header never reaches the
 * browser, and re-validates the payload against the shared contract.
 */
export async function reviewLeadAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  values: unknown,
): Promise<LeadReviewActionResult> {
  if (
    typeof productId !== "string" ||
    productId.length === 0 ||
    typeof opportunityId !== "string" ||
    opportunityId.length === 0 ||
    typeof leadId !== "string" ||
    leadId.length === 0
  ) {
    return { ok: false, message: "A product, opportunity and lead id are required." };
  }

  const parsed = UpdateLeadReviewSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "The review could not be recorded: please choose a valid status.",
    };
  }

  try {
    const lead = await reviewLead(opportunityId, leadId, parsed.data);
    revalidatePath(`/products/${productId}/leads`);
    revalidatePath(`/products/${productId}/leads/${leadId}`);
    return { ok: true, lead };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The review could not be recorded."),
    };
  }
}
