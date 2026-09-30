"use server";

import { revalidatePath } from "next/cache";
import { ClassifyOutreachReplySchema } from "@ai-sdr/contracts";
import { overrideOutreachReply, scanOutreachResults } from "./api";

function revalidate(productId: string): void {
  revalidatePath(`/products/${encodeURIComponent(productId)}/leads`);
}

/** Runs the bounded inbox scan for replies to a batch and refreshes the view. */
export async function scanOutreachResultsAction(
  opportunityId: string,
  batchId: string,
  productId: string,
): Promise<void> {
  await scanOutreachResults(opportunityId, batchId);
  revalidate(productId);
}

/** Human override of a reply classification (reviewable; never inferred). */
export async function overrideOutreachReplyAction(
  opportunityId: string,
  batchId: string,
  replyId: string,
  productId: string,
  formData: FormData,
): Promise<void> {
  const noteValue = formData.get("note");
  const parsed = ClassifyOutreachReplySchema.safeParse({
    classification: formData.get("classification"),
    ...(typeof noteValue === "string" && noteValue.trim().length > 0
      ? { note: noteValue.trim() }
      : {}),
  });
  if (!parsed.success) return;
  await overrideOutreachReply(
    opportunityId,
    batchId,
    replyId,
    parsed.data.classification,
    parsed.data.note,
  );
  revalidate(productId);
}
