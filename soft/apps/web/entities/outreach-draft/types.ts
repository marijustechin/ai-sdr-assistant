/**
 * Read-only shapes returned by the internal outreach-draft API.
 *
 * Mirror of `apps/api/src/modules/outreach-drafter/domain/types.ts`. Display
 * types only — the dashboard never derives claims or a sender identity.
 */

export type OutreachPreparationStatus = "PREPARED" | "BLOCKED";

export interface SenderSnapshotRead {
  senderName: string;
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
  emailAccountId: string | null;
  senderSnapshot: SenderSnapshotRead | null;
  version: number;
  createdAt: string;
  inputsStale: boolean;
  staleReasons: string[];
}

/** Human outreach eligibility decision, scoped to one lead (opportunity+company). */
export type OutreachDecisionStatus =
  | "ELIGIBLE"
  | "DO_NOT_CONTACT"
  | "EXISTING_RELATIONSHIP"
  | "NOT_RELEVANT"
  | "ALREADY_CONTACTED";

export type OutreachDecisionSource = "HUMAN";

export interface OutreachDecisionRead {
  id: string;
  opportunityId: string;
  companyId: string;
  decision: OutreachDecisionStatus;
  note: string | null;
  decidedByKind: OutreachDecisionSource;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachDecisionActionResult {
  ok: boolean;
  message?: string;
  decision?: OutreachDecisionRead;
}
