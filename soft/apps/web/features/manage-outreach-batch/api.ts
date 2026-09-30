import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  OutreachMessageStrategy,
  SendOutreachTestPreviewInput,
} from "@ai-sdr/contracts";
import type {
  OutreachBatchSummaryRead,
  OutreachSendStateRead,
  SendOutreachTestPreviewResultRead,
} from "@entities/outreach-batch";

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

/**
 * Explicitly reopens an APPROVED (not-yet-started) batch for editing; approved
 * versions are preserved as immutable history. Optionally resets customized
 * drafts (protected by default).
 */
export async function reopenOutreachBatch(
  opportunityId: string,
  batchId: string,
  resetCustomized: boolean,
): Promise<OutreachBatchSummaryRead> {
  return apiRequest<OutreachBatchSummaryRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/reopen`,
    {
      method: "POST",
      body: resetCustomized ? { resetCustomized: true } : {},
    },
  );
}

export async function applyOutreachMessage(
  opportunityId: string,
  batchId: string,
  strategy: OutreachMessageStrategy,
): Promise<OutreachBatchSummaryRead> {
  return apiRequest<OutreachBatchSummaryRead>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/apply-message`,
    { method: "POST", body: strategy },
  );
}

function sendUrl(opportunityId: string, batchId: string, action: string): string {
  return `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/${action}`;
}

export async function startOutreachSend(
  opportunityId: string,
  batchId: string,
): Promise<OutreachSendStateRead> {
  return apiRequest<OutreachSendStateRead>(
    sendUrl(opportunityId, batchId, 'start-sending'),
    { method: "POST" },
  );
}

export async function pauseOutreachSend(
  opportunityId: string,
  batchId: string,
): Promise<OutreachSendStateRead> {
  return apiRequest<OutreachSendStateRead>(
    sendUrl(opportunityId, batchId, 'pause'),
    { method: "POST" },
  );
}

export async function resumeOutreachSend(
  opportunityId: string,
  batchId: string,
): Promise<OutreachSendStateRead> {
  return apiRequest<OutreachSendStateRead>(
    sendUrl(opportunityId, batchId, 'resume'),
    { method: "POST" },
  );
}

export async function runOutreachSendDue(
  opportunityId: string,
  batchId: string,
): Promise<unknown> {
  return apiRequest<unknown>(sendUrl(opportunityId, batchId, 'run-due'), {
    method: "POST",
    body: {},
  });
}

export async function retryOutreachSentCopy(
  opportunityId: string,
  batchId: string,
): Promise<{ retried: number; appended: number }> {
  return apiRequest<{ retried: number; appended: number }>(
    sendUrl(opportunityId, batchId, 'retry-sent-copy'),
    { method: 'POST' },
  );
}

export async function cancelOutreachBatch(
  opportunityId: string,
  batchId: string,
): Promise<OutreachSendStateRead> {
  return apiRequest<OutreachSendStateRead>(
    sendUrl(opportunityId, batchId, 'cancel'),
    { method: 'POST' },
  );
}

/**
 * Controlled send-test preview: sends the actual prepared content to explicit
 * allowlisted test recipients only. Never contacts the real recipients.
 */
export async function sendOutreachTestPreview(
  opportunityId: string,
  batchId: string,
  input: SendOutreachTestPreviewInput,
): Promise<SendOutreachTestPreviewResultRead> {
  return apiRequest<SendOutreachTestPreviewResultRead>(
    sendUrl(opportunityId, batchId, 'test-preview'),
    { method: 'POST', body: input },
  );
}

/** Retries the Sent append for test copies only (never re-submits SMTP). */
export async function retryOutreachTestSentCopy(
  opportunityId: string,
  batchId: string,
): Promise<{ retried: number; appended: number }> {
  return apiRequest<{ retried: number; appended: number }>(
    `/opportunities/${enc(opportunityId)}/outreach-batches/${enc(batchId)}/test-preview/retry-sent-copy`,
    { method: 'POST' },
  );
}
