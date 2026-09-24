import type {
  QuoteInboundStatus,
  QuoteMatchConfidence,
  QuoteOutboundStatus,
} from '@ai-sdr/contracts';
import type { MarketResearchPriceState } from './market-research-state.js';

export type { QuoteInboundStatus, QuoteMatchConfidence, QuoteOutboundStatus };

export interface QuoteOutboundRecord {
  id: string;
  priceInquiryDraftId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  productId: string;
  senderProfileId: string | null;
  emailAccountId: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  messageId: string;
  providerMessageId: string | null;
  submissionStatus: QuoteOutboundStatus;
  failureCode: string | null;
  sentAt: Date;
  createdAt: Date;
}

export interface QuoteInboundRecord {
  id: string;
  emailAccountId: string | null;
  outboundMessageId: string | null;
  priceInquiryDraftId: string | null;
  mailboxUid: string;
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: Date | null;
  processingStatus: QuoteInboundStatus;
  matchConfidence: QuoteMatchConfidence;
  researchRunId: string | null;
  sourceReferenceId: string | null;
  evidenceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierQuoteRecord {
  id: string;
  inboundMessageId: string;
  outboundMessageId: string | null;
  priceInquiryDraftId: string | null;
  researchRunId: string | null;
  priceText: string | null;
  priceAmount: number | null;
  currency: string | null;
  priceUnit: string | null;
  moqText: string | null;
  incoterm: string | null;
  loadingLocationText: string | null;
  leadTimeText: string | null;
  validityText: string | null;
  vatIncluded: boolean | null;
  qualificationText: string | null;
  fieldProvenance: Record<string, string> | null;
  warnings: string[];
  sourceReferenceId: string | null;
  evidenceId: string | null;
  createdAt: Date;
}

export interface QuoteCollectionItemRecord {
  draftId: string;
  marketResearchState: MarketResearchPriceState;
  outbound: QuoteOutboundRecord | null;
  inboundMessages: QuoteInboundRecord[];
  quotes: SupplierQuoteRecord[];
}

export interface PersistOutboundData {
  priceInquiryDraftId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  productId: string;
  senderProfileId: string | null;
  emailAccountId: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  messageId: string;
  providerMessageId: string | null;
  submissionStatus: QuoteOutboundStatus;
  failureCode: string | null;
  sentAt: Date;
}

export interface PersistInboundData {
  emailAccountId: string | null;
  outboundMessageId: string | null;
  priceInquiryDraftId: string | null;
  mailboxUid: string;
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: Date | null;
  processingStatus: QuoteInboundStatus;
  matchConfidence: QuoteMatchConfidence;
  researchRunId: string | null;
  sourceReferenceId: string | null;
  evidenceId: string | null;
}

export interface PersistQuoteData {
  inboundMessageId: string;
  outboundMessageId: string | null;
  priceInquiryDraftId: string | null;
  researchRunId: string | null;
  priceText: string | null;
  priceAmount: number | null;
  currency: string | null;
  priceUnit: string | null;
  moqText: string | null;
  incoterm: string | null;
  loadingLocationText: string | null;
  leadTimeText: string | null;
  validityText: string | null;
  vatIncluded: boolean | null;
  qualificationText: string | null;
  fieldProvenance: Record<string, string> | null;
  warnings: string[];
  sourceReferenceId: string | null;
  evidenceId: string | null;
}
