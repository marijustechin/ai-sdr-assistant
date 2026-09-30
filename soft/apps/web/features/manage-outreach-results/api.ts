import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  OutreachBatchResultsRead,
  OutreachReplyClassification,
} from "@entities/outreach-result";

function enc(value: string): string {
  return encodeURIComponent(value);
}

function base(opportunityId: string, batchId: string): string {
  return `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/results`;
}

/** Bounded inbox scan for replies to this batch (read-only on our side). */
export async function scanOutreachResults(
  opportunityId: string,
  batchId: string,
): Promise<OutreachBatchResultsRead> {
  return apiRequest<OutreachBatchResultsRead>(`${base(opportunityId, batchId)}/scan`, {
    method: "POST",
    body: {},
  });
}

/** Human override of an auto reply classification. */
export async function overrideOutreachReply(
  opportunityId: string,
  batchId: string,
  replyId: string,
  classification: OutreachReplyClassification,
  note?: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `${base(opportunityId, batchId)}/replies/${enc(replyId)}`,
    { method: "PATCH", body: note ? { classification, note } : { classification } },
  );
}
