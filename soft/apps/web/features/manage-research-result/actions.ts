"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@shared/api/client";
import { describeApiError } from "@shared/api/errors";

function enc(value: string): string {
  return encodeURIComponent(value);
}

export interface ResultActionResult {
  ok: boolean;
  message: string;
}

/**
 * Human action: publish (freeze) the research result. The run becomes
 * COMPLETED or COMPLETED_WITH_PENDING_CLARIFICATIONS. Never sends mail.
 */
export async function finalizeResearchResultAction(
  productId: string,
  opportunityId: string,
  runId: string,
): Promise<ResultActionResult> {
  try {
    await apiRequest(
      `/opportunities/${enc(opportunityId)}/research-runs/${enc(runId)}/finalize`,
      { method: "POST" },
    );
    revalidatePath(
      `/products/${enc(productId)}/research/${enc(opportunityId)}/${enc(runId)}`,
    );
    return { ok: true, message: "Research result finalized." };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The result could not be finalized."),
    };
  }
}

/**
 * Manual trigger for due reply checks (the background scheduler is optional).
 * Only checks replies to already sent inquiries; never sends mail.
 */
export async function runDueFollowUpsAction(
  productId: string,
  opportunityId: string,
  runId: string,
): Promise<ResultActionResult> {
  try {
    const result = await apiRequest<{
      claimed: number;
      matched: number;
      noReply: number;
      expired: number;
      errors: number;
    }>(`/opportunities/${enc(opportunityId)}/quote-follow-ups/run-due`, {
      method: "POST",
      body: { limit: 10 },
      timeoutMs: 30000,
    });
    revalidatePath(
      `/products/${enc(productId)}/research/${enc(opportunityId)}/${enc(runId)}`,
    );
    return {
      ok: true,
      message:
        result.claimed === 0
          ? "No follow-up checks were due."
          : `Checked ${result.claimed} due inquiry(ies): ${result.matched} reply, ${result.noReply} no reply, ${result.expired} expired.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "Follow-up checks could not run."),
    };
  }
}
