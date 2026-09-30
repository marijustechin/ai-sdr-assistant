"use server";

import { revalidatePath } from "next/cache";
import { OutreachMessageStrategySchema } from "@ai-sdr/contracts";
import {
  applyOutreachMessage,
  approveOutreachBatch,
  cancelOutreachBatch,
  createOutreachBatch,
  pauseOutreachSend,
  regenerateOutreachBatch,
  reopenOutreachBatch,
  resumeOutreachSend,
  retryOutreachSentCopy,
  retryOutreachTestSentCopy,
  runOutreachSendDue,
  sendOutreachTestPreview,
  startOutreachSend,
} from "./api";
import { buildTestPreviewRequest } from "./test-preview";
import { resetCustomizedRequested } from "./reopen";

function revalidate(productId: string): void {
  revalidatePath(`/products/${encodeURIComponent(productId)}/leads`);
}

/**
 * Generates a batch for the opportunity scope (all currently eligible leads).
 * Form action: bound with (opportunityId, productId).
 */
export async function createOutreachBatchAction(
  opportunityId: string,
  productId: string,
): Promise<void> {
  await createOutreachBatch(opportunityId);
  revalidate(productId);
}

/** Approves the whole batch in one action (freezes the included versions). */
export async function approveOutreachBatchAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await approveOutreachBatch(opportunityId, batchId);
  revalidate(productId);
}

/** Regenerates unapproved, non-customized drafts (never overwrites edits). */
export async function regenerateOutreachBatchAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await regenerateOutreachBatch(opportunityId, batchId);
  revalidate(productId);
}

/**
 * Explicitly reopens an APPROVED batch for editing (approved versions remain as
 * immutable history). The optional checkbox resets customized drafts.
 */
export async function reopenOutreachBatchAction(
  opportunityId: string,
  batchId: string,
  productId: string,
  formData: FormData,
): Promise<void> {
  const resetCustomized = resetCustomizedRequested(formData);
  await reopenOutreachBatch(opportunityId, batchId, resetCustomized);
  revalidate(productId);
}

function optionalField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Applies a shared batch-level message (subject/proposition/terms/CTA). It
 * regenerates only unapproved, non-customized drafts; the evidence-backed
 * personalization is preserved, approved versions are untouched.
 */
export async function applyOutreachMessageAction(
  opportunityId: string,
  batchId: string,
  productId: string,
  formData: FormData,
): Promise<void> {
  const parsed = OutreachMessageStrategySchema.safeParse({
    subject: optionalField(formData, "subject"),
    proposition: optionalField(formData, "proposition"),
    terms: optionalField(formData, "terms"),
    cta: optionalField(formData, "cta"),
  });
  if (!parsed.success) return;
  await applyOutreachMessage(opportunityId, batchId, parsed.data);
  revalidate(productId);
}

/** Explicit human action: start sending the approved batch. */
export async function startOutreachSendAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await startOutreachSend(opportunityId, batchId);
  revalidate(productId);
}

export async function pauseOutreachSendAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await pauseOutreachSend(opportunityId, batchId);
  revalidate(productId);
}

export async function resumeOutreachSendAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await resumeOutreachSend(opportunityId, batchId);
  revalidate(productId);
}

/** Bounded manual worker tick (controlled testing; not automatic). */
export async function runOutreachSendDueAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await runOutreachSendDue(opportunityId, batchId);
  revalidate(productId);
}

/** Retries IMAP Sent append only — never SMTP. */
export async function retryOutreachSentCopyAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await retryOutreachSentCopy(opportunityId, batchId);
  revalidate(productId);
}

/** Cancels/archives a batch (never deleted); a cancelled batch cannot send. */
export async function cancelOutreachBatchAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await cancelOutreachBatch(opportunityId, batchId);
  revalidate(productId);
}

/**
 * Controlled send-test preview: sends the actual prepared content to explicit
 * allowlisted **test** recipients only. Requires the explicit acknowledgement
 * checkbox; a missing/invalid input performs no request. The real recipients are
 * never contacted and production send state is never advanced.
 */
export async function sendOutreachTestPreviewAction(
  opportunityId: string,
  batchId: string,
  productId: string,
  formData: FormData,
): Promise<void> {
  const input = buildTestPreviewRequest(formData);
  if (!input) return;
  await sendOutreachTestPreview(opportunityId, batchId, input);
  revalidate(productId);
}

/** Retries the Sent append for test copies only (never re-submits SMTP). */
export async function retryOutreachTestSentCopyAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await retryOutreachTestSentCopy(opportunityId, batchId);
  revalidate(productId);
}
