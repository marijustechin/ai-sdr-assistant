"use server";

import { revalidatePath } from "next/cache";
import {
  CreateEmailAccountSchema,
  UpdateEmailAccountSchema,
} from "@ai-sdr/contracts";
import { describeApiError } from "@shared/api/errors";
import type { EmailAccountActionResult } from "@entities/email-account";
import { createEmailAccount, updateEmailAccount } from "./api";

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

export async function createEmailAccountAction(
  values: unknown,
): Promise<EmailAccountActionResult> {
  const parsed = CreateEmailAccountSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  try {
    const account = await createEmailAccount(parsed.data);
    revalidatePath("/settings/email-accounts");
    return { ok: true, account };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The email account could not be saved."),
    };
  }
}

export async function updateEmailAccountAction(
  id: string,
  values: unknown,
): Promise<EmailAccountActionResult> {
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "An email account id is required." };
  }
  const parsed = UpdateEmailAccountSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  try {
    const account = await updateEmailAccount(id, parsed.data);
    revalidatePath("/settings/email-accounts");
    revalidatePath(`/settings/email-accounts/${id}`);
    return { ok: true, account };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The email account could not be saved."),
    };
  }
}
