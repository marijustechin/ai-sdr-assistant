import type {
  PriceInquiryPurpose,
  PriceInquiryStatus,
} from '@ai-sdr/contracts';

export type { PriceInquiryPurpose, PriceInquiryStatus };

/** Non-secret sender identity snapshot used for a draft (never credentials). */
export interface SenderSnapshot {
  senderName: string;
  senderTitle: string | null;
  companyName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  signature: string | null;
}

export interface PriceInquiryDraftRecord {
  id: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  productId: string;
  contactId: string | null;
  recipientEmail: string | null;
  recipientRationale: string;
  senderProfileId: string | null;
  emailAccountId: string | null;
  senderSnapshot: SenderSnapshot | null;
  purpose: PriceInquiryPurpose;
  status: PriceInquiryStatus;
  language: string;
  subject: string;
  body: string;
  generatedSubject: string;
  generatedBody: string;
  specificationSummary: string;
  rationale: string;
  sourceReferenceId: string | null;
  evidenceId: string | null;
  claimId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  /** True when a current input (lead state, recipient, sender) changed. */
  inputsStale: boolean;
  staleReasons: string[];
}

export interface CreatePriceInquiryDraftData {
  opportunityId: string;
  leadId: string;
  companyId: string;
  productId: string;
  contactId?: string | null;
  recipientEmail?: string | null;
  recipientRationale: string;
  senderProfileId?: string | null;
  emailAccountId?: string | null;
  senderSnapshot?: SenderSnapshot | null;
  language: string;
  subject: string;
  body: string;
  generatedSubject: string;
  generatedBody: string;
  specificationSummary: string;
  rationale: string;
  sourceReferenceId?: string | null;
  evidenceId?: string | null;
  claimId?: string | null;
  fingerprint: string;
}

/** Editable review fields. `undefined` leaves a field unchanged. */
export interface UpdatePriceInquiryDraftData {
  subject?: string;
  body?: string;
  recipientEmail?: string | null;
  contactId?: string | null;
  senderProfileId?: string;
  emailAccountId?: string | null;
  senderSnapshot?: SenderSnapshot | null;
}
