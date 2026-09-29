import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  OutreachBatchRead,
  OutreachBatchSummaryRead,
} from "./types";

/** Server-only reads for outreach batches. The internal key stays server-side. */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function listOutreachBatches(
  opportunityId: string,
): Promise<OutreachBatchRead[]> {
  return apiRequest<OutreachBatchRead[]>(
    `/opportunities/${enc(opportunityId)}/outreach-batches`,
    { method: "GET" },
  );
}

export async function getOutreachBatch(
  opportunityId: string,
  batchId: string,
): Promise<OutreachBatchSummaryRead> {
  return apiRequest<OutreachBatchSummaryRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}`,
    { method: "GET" },
  );
}
