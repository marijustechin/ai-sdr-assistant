"use server";

import { revalidatePath } from "next/cache";
import { ReviseOutreachDraftSchema } from "@ai-sdr/contracts";
import { describeApiError } from "@shared/api/errors";
import type { OutreachDraftActionResult } from "@entities/outreach-draft";

/**
 * Saves a human revision of a materialized outreach draft. Only the subject and
 * canonical body are accepted; the API regenerates the plain-text and HTML
 * bodies and appends a new version. Never sends.
 */
export async function reviseOutreachDraftAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  draftId: string,
  values: unknown,
): Promise<OutreachDraftActionResult> {
  const parsed = ReviseOutreachDraftSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Provide a subject or a message body to save a revision.",
    };
  }
  try {
    const { reviseOutreachDraft } = await import("./api");
    const draft = await reviseOutreachDraft(
      opportunityId,
      leadId,
      draftId,
      parsed.data,
    );
    revalidatePath(
      `/products/${encodeURIComponent(productId)}/leads/${encodeURIComponent(
        opportunityId,
      )}/${encodeURIComponent(leadId)}`,
    );
    return { ok: true, draft };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The draft revision could not be saved.",
      ),
    };
  }
}
