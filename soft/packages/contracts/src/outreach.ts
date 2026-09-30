import { z } from 'zod';

/**
 * Initial outreach-draft contracts (write side).
 *
 * A draft is prepared for an eligible lead from supported context/evidence. When
 * essential information (sender identity, offer summary) is not supplied or
 * derivable, the persisted outcome is `BLOCKED` with precise missing fields —
 * never a placeholder labelled as a finished draft. No sending is represented.
 */

export const OutreachPreparationStatusSchema = z.enum(['PREPARED', 'BLOCKED']);

/**
 * Optional provisioning inputs for a preparation run. `contactId`/`language`
 * override the automatic selection (for debugging/operator use). `offerSummary`
 * is a *supplied* fact; when absent the offer name from context is used. The
 * sender identity is resolved from the product's assigned sender profile — it is
 * never supplied here.
 */
export const PrepareOutreachDraftSchema = z.strictObject({
  contactId: z.uuid().optional(),
  language: z.string().trim().min(2).max(35).optional(),
  offerSummary: z.string().trim().min(1).max(1000).optional(),
});

export type OutreachPreparationStatus = z.infer<
  typeof OutreachPreparationStatusSchema
>;
export type PrepareOutreachDraftInput = z.infer<
  typeof PrepareOutreachDraftSchema
>;

/**
 * A human revision of a prepared draft. The canonical `canonicalBody` (message
 * text WITHOUT the closing/signature) is the single editable source: the server
 * deterministically regenerates the sendable plain-text `body` and the
 * `htmlBody` from it plus the structured sender identity. A revision creates a
 * new append-only draft version; the previous version is never rewritten.
 */
export const ReviseOutreachDraftSchema = z
  .strictObject({
    subject: z.string().trim().min(1).max(512).optional(),
    canonicalBody: z.string().trim().min(1).max(20000).optional(),
  })
  .refine((value) => value.subject !== undefined || value.canonicalBody !== undefined, {
    message: 'a revision must change the subject or the canonical body',
  });

export type ReviseOutreachDraftInput = z.infer<
  typeof ReviseOutreachDraftSchema
>;

/**
 * Batch/campaign review. A batch groups generated drafts for one opportunity
 * scope; approval freezes the exact version of every included draft. The status
 * vocabulary reserves QUEUED/SENDING/SENT for a future controlled-pacing send
 * worker (none implemented here).
 */
export const OutreachBatchStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'QUEUED',
  'SENDING',
  'SENT',
  'FAILED',
  'CANCELLED',
]);

/** Delivery state of one outbound message. */
export const OutreachOutboundStatusSchema = z.enum([
  'QUEUED',
  'SENDING',
  'SENT',
  'FAILED',
  'CANCELLED',
]);

/** Sent-folder persistence state, independent of SMTP success. */
export const OutreachSentCopyStatusSchema = z.enum([
  'PENDING',
  'APPENDED',
  'FAILED',
]);

/** Approval state of one immutable draft version. */
export const OutreachApprovalStatusSchema = z.enum(['PENDING', 'APPROVED']);

/** Optional batch scope overrides; the opportunity is the primary scope. */
export const CreateOutreachBatchSchema = z.strictObject({
  language: z.string().trim().min(2).max(35).optional(),
  targetMarketId: z.uuid().optional(),
  senderProfileId: z.uuid().optional(),
  /** Seconds between sends per sender mailbox (default 180 when omitted). */
  pacingSeconds: z.number().int().min(0).max(86_400).optional(),
});

export type OutreachBatchStatus = z.infer<typeof OutreachBatchStatusSchema>;
export type OutreachOutboundStatus = z.infer<
  typeof OutreachOutboundStatusSchema
>;
export type OutreachSentCopyStatus = z.infer<
  typeof OutreachSentCopyStatusSchema
>;
export type OutreachApprovalStatus = z.infer<
  typeof OutreachApprovalStatusSchema
>;
export type CreateOutreachBatchInput = z.infer<
  typeof CreateOutreachBatchSchema
>;

/** Bounded manual trigger for the send worker (manual run-due path). */
export const RunOutreachSendSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).optional(),
});

export type RunOutreachSendInput = z.infer<typeof RunOutreachSendSchema>;

/**
 * Shared batch-level first-contact message overrides. Only the subject,
 * proposition ("shared commercial/offer text"), terms and CTA can be shared;
 * the evidence-backed personalization is always per-lead. Omitting or nullifying
 * a field falls back to the language scaffold.
 */
export const OutreachMessageStrategySchema = z.strictObject({
  subject: z.string().trim().min(1).max(512).nullable().optional(),
  proposition: z.string().trim().min(1).max(2000).nullable().optional(),
  terms: z.string().trim().min(1).max(2000).nullable().optional(),
  cta: z.string().trim().min(1).max(512).nullable().optional(),
});

export type OutreachMessageStrategy = z.infer<
  typeof OutreachMessageStrategySchema
>;

/**
 * Explicitly reopens an APPROVED but not-yet-started batch for editing. The
 * approved draft versions are preserved as immutable history; a subsequent
 * `apply-message` creates new PENDING versions from the shared message. Only
 * batches that have not entered QUEUED/SENDING/SENT may be reopened.
 *
 * `resetCustomized` is the operator's explicit opt-in to also reset individually
 * customized drafts (which are protected by default).
 */
export const ReopenOutreachBatchSchema = z.strictObject({
  resetCustomized: z.boolean().optional(),
});

export type ReopenOutreachBatchInput = z.infer<
  typeof ReopenOutreachBatchSchema
>;

/**
 * Controlled live **send-test preview** for human visual verification.
 *
 * A test preview sends the *actual prepared content* — sender/From identity,
 * Reply-To, canonical subject, plain-text and HTML bodies, structured signature,
 * optional logo and MIME formatting — to explicitly supplied **test** recipients
 * only. It never contacts the real draft recipient, never advances production
 * batch/send state, never consumes pacing, and never marks the real recipient as
 * contacted. Identifiable via non-visible diagnostic headers; the real subject is
 * preserved unless an optional prefix is supplied.
 *
 * The allowlist is intentionally fixed for this controlled verification and may
 * be changed later only by an explicit human decision.
 */
export const OUTREACH_TEST_RECIPIENT_ALLOWLIST = [
  'm.smiginas@gmail.com',
  'info@alfasis.eu',
] as const;

export const OutreachTestPreviewScopeSchema = z.enum(['ALL', 'SELECTED']);

export const SendOutreachTestPreviewSchema = z
  .strictObject({
    scope: OutreachTestPreviewScopeSchema,
    /** Required when scope = SELECTED; must be empty/absent when ALL. */
    draftIds: z.array(z.uuid()).max(50).optional(),
    /** Explicit test recipients; each must be on the allowlist. */
    testRecipients: z.array(z.email().max(320)).min(1).max(10),
    /** Optional `[TEST]`-style prefix; default keeps the real subject verbatim. */
    subjectPrefix: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .refine(
    (value) =>
      value.scope === 'ALL'
        ? value.draftIds === undefined || value.draftIds.length === 0
        : (value.draftIds?.length ?? 0) >= 1,
    { message: 'scope SELECTED requires at least one draftId; ALL takes none' },
  );

export type OutreachTestPreviewScope = z.infer<
  typeof OutreachTestPreviewScopeSchema
>;
export type SendOutreachTestPreviewInput = z.infer<
  typeof SendOutreachTestPreviewSchema
>;

/** Delivery outcome of one test copy (never the production outbound status). */
export const OutreachTestDeliveryStatusSchema = z.enum(['SENT', 'FAILED']);

/** One selectable draft in the test-preview surface (latest version per lead). */
export const OutreachTestPreviewDraftSchema = z.strictObject({
  draftId: z.string(),
  leadId: z.string(),
  companyId: z.string(),
  recipientEmail: z.string().nullable(),
  subject: z.string().nullable(),
  approvalStatus: OutreachApprovalStatusSchema,
  preparationStatus: OutreachPreparationStatusSchema,
  ready: z.boolean(),
  blockedReason: z.string().nullable(),
});

export const OutreachTestDeliverySummarySchema = z.strictObject({
  id: z.string(),
  draftId: z.string(),
  batchId: z.string(),
  testRecipient: z.string(),
  originalRecipient: z.string(),
  subject: z.string(),
  subjectPrefixed: z.boolean(),
  status: OutreachTestDeliveryStatusSchema,
  sentCopyStatus: OutreachSentCopyStatusSchema,
  failureCode: z.string().nullable(),
  createdAt: z.string(),
});

export const OutreachTestPreviewSchema = z.strictObject({
  batchId: z.string(),
  language: z.string(),
  allowlist: z.array(z.string()),
  readyCount: z.number().int(),
  blockedCount: z.number().int(),
  drafts: z.array(OutreachTestPreviewDraftSchema),
  lastDeliveries: z.array(OutreachTestDeliverySummarySchema),
});

export const SendOutreachTestPreviewResultSchema = z.strictObject({
  batchId: z.string(),
  scope: OutreachTestPreviewScopeSchema,
  testRecipients: z.array(z.string()),
  subjectPrefix: z.string().nullable(),
  deliveries: z.array(OutreachTestDeliverySummarySchema),
  sent: z.number().int(),
  failed: z.number().int(),
  appended: z.number().int(),
  copyFailures: z.number().int(),
  /** Always true: a test preview never advances production state. */
  productionUnchanged: z.literal(true),
});

export type OutreachTestDeliveryStatus = z.infer<
  typeof OutreachTestDeliveryStatusSchema
>;
export type OutreachTestPreviewDraft = z.infer<
  typeof OutreachTestPreviewDraftSchema
>;
export type OutreachTestDeliverySummary = z.infer<
  typeof OutreachTestDeliverySummarySchema
>;
export type OutreachTestPreview = z.infer<typeof OutreachTestPreviewSchema>;
export type SendOutreachTestPreviewResult = z.infer<
  typeof SendOutreachTestPreviewResultSchema
>;

/**
 * Human outreach eligibility decision, scoped to one opportunity + company.
 *
 * Kept separate from research evidence and from the agent qualification so
 * Market Research stays factual. Any state other than `ELIGIBLE` excludes the
 * company from outreach for that scope and **overrides** the agent gate;
 * `ELIGIBLE` records that no exclusion applies (it does not bypass the normal
 * qualification gate). Not a global company blacklist.
 */
export const OutreachDecisionStatusSchema = z.enum([
  'ELIGIBLE',
  'DO_NOT_CONTACT',
  'EXISTING_RELATIONSHIP',
  'NOT_RELEVANT',
  'ALREADY_CONTACTED',
]);

/** Decision states that exclude a company from outreach. */
export const OUTREACH_EXCLUDING_DECISIONS = [
  'DO_NOT_CONTACT',
  'EXISTING_RELATIONSHIP',
  'NOT_RELEVANT',
  'ALREADY_CONTACTED',
] as const;

/** Provenance of a decision — always human. */
export const OutreachDecisionSourceSchema = z.enum(['HUMAN']);

export const SetOutreachDecisionSchema = z.strictObject({
  decision: OutreachDecisionStatusSchema,
  note: z.string().trim().min(1).max(2000).optional(),
});

export const OutreachDecisionResponseSchema = z.strictObject({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  companyId: z.string().min(1),
  decision: OutreachDecisionStatusSchema,
  note: z.string().nullable(),
  decidedByKind: OutreachDecisionSourceSchema,
  decidedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OutreachDecisionStatus = z.infer<
  typeof OutreachDecisionStatusSchema
>;
export type OutreachDecisionSource = z.infer<
  typeof OutreachDecisionSourceSchema
>;
export type SetOutreachDecisionInput = z.infer<
  typeof SetOutreachDecisionSchema
>;
export type OutreachDecisionResponse = z.infer<
  typeof OutreachDecisionResponseSchema
>;
