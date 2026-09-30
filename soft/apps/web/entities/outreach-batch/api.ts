import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  OutreachBatchRead,
  OutreachBatchSummaryRead,
  OutreachSendStateRead,
  OutreachTestPreviewRead,
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

export async function getOutreachSendState(
  opportunityId: string,
  batchId: string,
): Promise<OutreachSendStateRead> {
  return apiRequest<OutreachSendStateRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/send-state`,
    { method: "GET" },
  );
}

/** Read-only controlled send-test preview surface (selectable drafts, history). */
export async function getOutreachTestPreview(
  opportunityId: string,
  batchId: string,
): Promise<OutreachTestPreviewRead> {
  return apiRequest<OutreachTestPreviewRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/test-preview`,
    { method: "GET" },
  );
}
