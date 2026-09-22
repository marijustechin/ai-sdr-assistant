"use server";

import { revalidatePath } from "next/cache";
import {
  CreateSenderProfileSchema,
  UpdateSenderProfileSchema,
} from "@ai-sdr/contracts";
import { describeApiError } from "@shared/api/errors";
import type { SenderProfileActionResult } from "@entities/sender-profile";
import { createSenderProfile, updateSenderProfile } from "./api";

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export async function createSenderProfileAction(
  values: unknown,
): Promise<SenderProfileActionResult> {
  const parsed = CreateSenderProfileSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  try {
    const profile = await createSenderProfile(parsed.data);
    revalidatePath("/settings/sender-profiles");
    return { ok: true, profile };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The sender profile could not be saved."),
    };
  }
}

export async function updateSenderProfileAction(
  id: string,
  values: unknown,
): Promise<SenderProfileActionResult> {
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "A sender profile id is required." };
  }
  const parsed = UpdateSenderProfileSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  try {
    const profile = await updateSenderProfile(id, parsed.data);
    revalidatePath("/settings/sender-profiles");
    revalidatePath(`/settings/sender-profiles/${id}`);
    return { ok: true, profile };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The sender profile could not be saved."),
    };
  }
}
