/**
 * Read-only shapes returned by the internal sender-profile API.
 *
 * A sender profile is an identity plus an optional mailbox-connection reference
 * (`emailAccountId`). It never carries transport credentials.
 */

export type SenderProfileStatus = "ACTIVE" | "DISABLED";

export interface SenderProfileRead {
  id: string;
  label: string;
  senderName: string;
  senderTitle: string | null;
  companyName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  phone: string | null;
  website: string | null;
  whatsappEnabled: boolean;
  whatsappPhone: string | null;
  logoUrl: string | null;
  includeLogoInSignature: boolean;
  signature: string | null;
  status: SenderProfileStatus;
  emailAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SenderProfileActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  profile?: SenderProfileRead;
}
