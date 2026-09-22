/**
 * Read-only shapes returned by the internal outreach-draft API.
 *
 * Mirror of `apps/api/src/modules/outreach-drafter/domain/types.ts`. Display
 * types only — the dashboard never derives claims or a sender identity.
 */

export type OutreachPreparationStatus = "PREPARED" | "BLOCKED";

export interface SenderSnapshotRead {
  senderName: string;
  companyName: string;
  fromEmail: string;
  replyToEmail: string | null;
  signature: string | null;
}

export interface OutreachDraftRead {
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
  emailAccountId: string | null;
  senderSnapshot: SenderSnapshotRead | null;
  version: number;
  createdAt: string;
  inputsStale: boolean;
  staleReasons: string[];
}
