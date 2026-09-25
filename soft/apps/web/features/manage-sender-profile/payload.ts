import type { SenderProfileStatus } from "@entities/sender-profile";

/**
 * Form state for a sender profile (identity only). The mailbox connection is a
 * reference to an email account, never a credential value.
 */
export interface SenderProfileFormState {
  label: string;
  senderName: string;
  senderTitle: string;
  companyName: string;
  fromEmail: string;
  replyToEmail: string;
  phone: string;
  website: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  logoUrl: string;
  includeLogoInSignature: boolean;
  signature: string;
  status: SenderProfileStatus;
  emailAccountId: string;
}

/**
 * Build the sender-profile request body from the form state.
 *
 * - Identity fields are always included. Blank Reply-To/signature are omitted.
 * - `senderTitle` and `companyName` are optional; a blank value is omitted on
 *   create and cleared (`null`) on edit. A company/brand is never invented.
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
    fromEmail: state.fromEmail,
  };
  if (state.senderTitle.trim().length > 0) {
    values.senderTitle = state.senderTitle;
  } else if (mode === "edit") {
    values.senderTitle = null;
  }
  if (state.companyName.trim().length > 0) {
    values.companyName = state.companyName;
  } else if (mode === "edit") {
    values.companyName = null;
  }
  if (state.replyToEmail.trim().length > 0) {
    values.replyToEmail = state.replyToEmail;
  }
  if (state.phone.trim().length > 0) {
    values.phone = state.phone;
  } else if (mode === "edit") {
    values.phone = null;
  }
  if (state.website.trim().length > 0) {
    values.website = state.website;
  } else if (mode === "edit") {
    values.website = null;
  }
  // WhatsApp is a display flag; a blank dedicated number falls back to the main
  // phone. Included on create so the flag is explicit; on edit a blank dedicated
  // number is cleared.
  values.whatsappEnabled = state.whatsappEnabled;
  if (state.whatsappEnabled && state.whatsappPhone.trim().length > 0) {
    values.whatsappPhone = state.whatsappPhone;
  } else if (mode === "edit") {
    values.whatsappPhone = null;
  }
  // Logo branding: the flag is explicit; a blank URL clears the reference on
  // edit and is omitted on create (generation then omits the image).
  values.includeLogoInSignature = state.includeLogoInSignature;
  if (state.logoUrl.trim().length > 0) {
    values.logoUrl = state.logoUrl;
  } else if (mode === "edit") {
    values.logoUrl = null;
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
