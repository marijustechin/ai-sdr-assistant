"use server";

import { revalidatePath } from "next/cache";
import {
  approveOutreachBatch,
  createOutreachBatch,
  regenerateOutreachBatch,
} from "./api";

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
