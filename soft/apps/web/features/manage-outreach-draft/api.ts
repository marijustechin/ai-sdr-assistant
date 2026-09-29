import "server-only";
import { apiRequest } from "@shared/api/client";
import type { ReviseOutreachDraftInput } from "@ai-sdr/contracts";
import type { OutreachDraftRead } from "@entities/outreach-draft";

/**
 * Server-only write for a human draft revision. Only the subject and the
 * canonical body are sent; the plain-text `body` and `htmlBody` are regenerated
 * by the API. The internal key never reaches the browser.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function reviseOutreachDraft(
  opportunityId: string,
  leadId: string,
  draftId: string,
  input: ReviseOutreachDraftInput,
): Promise<OutreachDraftRead> {
  return apiRequest<OutreachDraftRead>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/outreach-drafts/${enc(draftId)}`,
    { method: "PATCH", body: input },
  );
}
