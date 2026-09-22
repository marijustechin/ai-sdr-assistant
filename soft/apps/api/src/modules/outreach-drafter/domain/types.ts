import type { OutreachPreparationStatus } from '@ai-sdr/contracts';

export type { OutreachPreparationStatus };

/** Non-secret sender identity actually used for a draft (never credentials). */
export interface SenderSnapshot {
  senderName: string;
  companyName: string;
  fromEmail: string;
  replyToEmail: string | null;
  signature: string | null;
}

export interface OutreachDraftRecord {
  id: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  contactId: string | null;
  recipientEmail: string | null;
  language: string;
  preparationStatus: OutreachPreparationStatus;
  subject: string | null;
  body: string | null;
  rationale: string;
  recipientRationale: string;
  missingFields: string[];
  contextVersion: number | null;
  evidenceId: string | null;
  claimId: string | null;
  sourceReferenceId: string | null;
  senderProfileId: string | null;
  /** Mailbox connection resolved from the sender profile (no secret snapshot). */
  emailAccountId: string | null;
  senderSnapshot: SenderSnapshot | null;
  version: number;
  createdAt: Date;
  /** True when a current input (lead qualification/review, recipient, sender) changed. */
  inputsStale: boolean;
  staleReasons: string[];
}

export interface CreateDraftData {
  opportunityId: string;
  leadId: string;
  companyId: string;
  contactId?: string;
  recipientEmail?: string;
  language: string;
  preparationStatus: OutreachPreparationStatus;
  subject?: string;
  body?: string;
  rationale: string;
  recipientRationale: string;
  missingFields: string[];
  contextVersion?: number;
  evidenceId?: string;
  claimId?: string;
  sourceReferenceId?: string;
  senderProfileId?: string;
  emailAccountId?: string;
  senderSnapshot?: SenderSnapshot;
  version: number;
  fingerprint: string;
}
