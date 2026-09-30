import {
  SendOutreachTestPreviewSchema,
  type SendOutreachTestPreviewInput,
} from "@ai-sdr/contracts";

/**
 * Normalizes raw test-recipient input (checkbox values and/or comma/newline
 * separated text) into a deduplicated, lower-cased list. The API still enforces
 * the allowlist server-side; this only cleans the transport shape.
 */
export function parseTestRecipients(values: string[]): string[] {
  const recipients: string[] = [];
  for (const raw of values) {
    for (const token of raw.split(/[\s,;]+/)) {
      const email = token.trim().toLowerCase();
      if (email && !recipients.includes(email)) recipients.push(email);
    }
  }
  return recipients;
}

function optionalField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Builds the send-test-preview request from the batch-review form. Returns null
 * when the explicit acknowledgement checkbox is not ticked or the input is
 * otherwise incomplete/invalid, so the caller performs no request.
 */
export function buildTestPreviewRequest(
  formData: FormData,
): SendOutreachTestPreviewInput | null {
  if (formData.get("confirm") !== "on") return null;
  const scope = formData.get("scope") === "SELECTED" ? "SELECTED" : "ALL";
  const recipients = parseTestRecipients(
    formData.getAll("testRecipients").map((value) => String(value)),
  );
  if (recipients.length === 0) return null;
  const draftId = formData.get("draftId");
  const parsed = SendOutreachTestPreviewSchema.safeParse({
    scope,
    draftIds:
      scope === "SELECTED" && typeof draftId === "string" && draftId.length > 0
        ? [draftId]
        : undefined,
    testRecipients: recipients,
    subjectPrefix: optionalField(formData, "subjectPrefix"),
  });
  return parsed.success ? parsed.data : null;
}
