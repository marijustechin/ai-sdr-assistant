import "server-only";
import { apiRequest } from "@shared/api/client";
import type { OutreachBatchResultsRead } from "./types";

/** Server-only reads for outreach results / campaign summary. */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function getOutreachResults(
  opportunityId: string,
  batchId: string,
): Promise<OutreachBatchResultsRead> {
  return apiRequest<OutreachBatchResultsRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/results`,
    { method: "GET" },
  );
}
