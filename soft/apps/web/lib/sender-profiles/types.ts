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
  companyName: string;
  fromEmail: string;
  replyToEmail: string | null;
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
