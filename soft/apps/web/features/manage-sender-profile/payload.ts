import type { SenderProfileStatus } from "@entities/sender-profile";

/**
 * Form state for a sender profile (identity only). The mailbox connection is a
 * reference to an email account, never a credential value.
 */
export interface SenderProfileFormState {
  label: string;
  senderName: string;
  companyName: string;
  fromEmail: string;
  replyToEmail: string;
  signature: string;
  status: SenderProfileStatus;
  emailAccountId: string;
}

/**
 * Build the sender-profile request body from the form state.
 *
 * - Identity fields are always included. Blank Reply-To/signature are omitted.
 * - `status` is included only when editing.
 * - `emailAccountId` is included when chosen; on edit an empty selection clears
 *   the reference explicitly.
 */
export function buildSenderProfilePayload(
  state: SenderProfileFormState,
  mode: "create" | "edit",
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    label: state.label,
    senderName: state.senderName,
    companyName: state.companyName,
    fromEmail: state.fromEmail,
  };
  if (state.replyToEmail.trim().length > 0) {
    values.replyToEmail = state.replyToEmail;
  }
  if (state.signature.trim().length > 0) {
    values.signature = state.signature;
  }
  if (mode === "edit") {
    values.status = state.status;
  }

  if (state.emailAccountId.trim().length > 0) {
    values.emailAccountId = state.emailAccountId;
  } else if (mode === "edit") {
    values.emailAccountId = null;
  }

  return values;
}
