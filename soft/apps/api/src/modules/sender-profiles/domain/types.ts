import type { SenderProfileStatus } from '@ai-sdr/contracts';

export type { SenderProfileStatus };

/**
 * Public record — a reusable identity plus an optional mailbox-connection
 * reference. It never carries transport credentials (those live on
 * `email_accounts`).
 */
export interface SenderProfileRecord {
  id: string;
  label: string;
  senderName: string;
  companyName: string;
  fromEmail: string;
  replyToEmail: string | null;
  signature: string | null;
  status: SenderProfileStatus;
  emailAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSenderProfileData {
  label: string;
  senderName: string;
  companyName: string;
  fromEmail: string;
  replyToEmail?: string | null;
  signature?: string | null;
  status?: SenderProfileStatus;
  emailAccountId?: string | null;
}

export interface UpdateSenderProfileData {
  label?: string;
  senderName?: string;
  companyName?: string;
  fromEmail?: string;
  replyToEmail?: string | null;
  signature?: string | null;
  status?: SenderProfileStatus;
  /** `null` clears the mailbox-connection reference. */
  emailAccountId?: string | null;
}
