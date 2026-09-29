import "server-only";
import { apiRequest } from "@shared/api/client";
import type { OutreachBatchSummaryRead } from "@entities/outreach-batch";

/** Server-only batch writes (generate / approve / regenerate). No sending. */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function createOutreachBatch(
  opportunityId: string,
): Promise<OutreachBatchSummaryRead> {
  return apiRequest<OutreachBatchSummaryRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches`,
    { method: "POST", body: {} },
  );
}

export async function approveOutreachBatch(
  opportunityId: string,
  batchId: string,
): Promise<OutreachBatchSummaryRead> {
  return apiRequest<OutreachBatchSummaryRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/approve`,
    { method: "POST" },
  );
}

export async function regenerateOutreachBatch(
  opportunityId: string,
  batchId: string,
): Promise<OutreachBatchSummaryRead> {
  return apiRequest<OutreachBatchSummaryRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/regenerate`,
    { method: "POST" },
  );
}
