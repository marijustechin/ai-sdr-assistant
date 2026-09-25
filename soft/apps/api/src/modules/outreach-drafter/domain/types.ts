import type {
  OutreachDecisionSource,
  OutreachDecisionStatus,
  OutreachPreparationStatus,
} from '@ai-sdr/contracts';

export type { OutreachDecisionSource, OutreachDecisionStatus, OutreachPreparationStatus };

/** Non-secret sender identity actually used for a draft (never credentials). */
export interface SenderSnapshot {
  senderName: string;
  /** Canonical role/title, passed through verbatim (never translated). */
  senderTitle: string | null;
  companyName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  phone: string | null;
  website: string | null;
  whatsappEnabled: boolean;
  whatsappPhone: string | null;
  includeLogoInSignature: boolean;
  logoUrl: string | null;
}

/**
 * Human outreach decision for one (opportunity, company) scope. Kept separate
 * from research evidence and the agent qualification; a human exclusion
 * overrides both.
 */
export interface OutreachDecisionRecord {
  id: string;
  opportunityId: string;
  companyId: string;
  decision: OutreachDecisionStatus;
  note: string | null;
  decidedByKind: OutreachDecisionSource;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetOutreachDecisionData {
  decision: OutreachDecisionStatus;
  note?: string | null;
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
  /** Generated HTML body (text body + HTML signature); never trusted HTML. */
  htmlBody: string | null;
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
  htmlBody?: string;
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
