import "server-only";
import { apiRequest } from "@shared/api/client";
import type { OutreachDraftRead } from "./types";

/**
 * Server-only reads for lead outreach drafts. The internal API key is attached
 * by `apiRequest`; it never reaches the browser. There is no send path.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** GET .../leads/:leadId/outreach-drafts — prepared/blocked drafts (newest first). */
export async function listOutreachDrafts(
  opportunityId: string,
  leadId: string,
): Promise<OutreachDraftRead[]> {
  return apiRequest<OutreachDraftRead[]>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/outreach-drafts`,
    { method: "GET" },
  );
}
