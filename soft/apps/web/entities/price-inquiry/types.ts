/**
 * Read-only shapes returned by the internal price-inquiry API. Mirrors the API
 * contract; never carries transport secrets.
 */

export type PriceInquiryPurpose = "PRICE_INQUIRY";
export type PriceInquiryStatus =
  | "READY_FOR_HUMAN_REVIEW"
  | "SENT"
  | "REPLY_RECEIVED"
  | "QUOTE_EXTRACTED";

export interface PriceInquirySenderSnapshotRead {
  senderName: string;
  senderTitle: string | null;
  companyName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  signature: string | null;
}

export interface PriceInquiryDraftRead {
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
  senderSnapshot: PriceInquirySenderSnapshotRead | null;
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
  createdAt: string;
  updatedAt: string;
  inputsStale: boolean;
  staleReasons: string[];
}

export interface PriceInquiryActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  draft?: PriceInquiryDraftRead;
}

export interface SendPriceInquiryActionResult {
  ok: boolean;
  message?: string;
  draft?: PriceInquiryDraftRead;
}

export interface CheckRepliesActionResult {
  ok: boolean;
  message?: string;
  scanned?: number;
  persisted?: number;
  matched?: number;
  extracted?: number;
  unmatched?: number;
  skipped?: number;
}
