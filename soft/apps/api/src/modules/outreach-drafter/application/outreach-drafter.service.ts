import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateOutreachBatchInput,
  PrepareOutreachDraftInput,
  ReviseOutreachDraftInput,
  SetOutreachDecisionInput,
} from '@ai-sdr/contracts';
import type { ResearchContext } from '@ai-sdr/contracts';
import { ContactDiscoveryService } from '../../contact-discovery/application/contact-discovery.service.js';
import { ResearchContextService } from '../../control-plane/application/research-context.service.js';
import { EvidenceService } from '../../evidence/application/evidence.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import type { LeadRecord } from '../../lead-discoverer/domain/types.js';
import { ProductsAndOffersService } from '../../products-and-offers/application/products-and-offers.service.js';
import { SenderProfilesService } from '../../sender-profiles/application/sender-profiles.service.js';
import type { SenderProfileRecord } from '../../sender-profiles/domain/types.js';
import {
  buildDraftContent,
  composeOutreachBodies,
  type SenderIdentity,
} from '../domain/content.js';
import { isExcludingOutreachDecision } from '../domain/decisions.js';
import { selectLanguage } from '../domain/language.js';
import type {
  CreateDraftData,
  OutreachBatchCounts,
  OutreachBatchPreview,
  OutreachBatchRecord,
  OutreachBatchSummary,
  OutreachDecisionRecord,
  OutreachDraftRecord,
  SenderSnapshot,
} from '../domain/types.js';
import {
  OutreachDraftRepository,
  type OutreachDraftRow,
} from '../infrastructure/outreach-draft.repository.js';
import { OutreachDecisionRepository } from '../infrastructure/outreach-decision.repository.js';
import {
  OutreachBatchRepository,
  type BatchDraftRow,
} from '../infrastructure/outreach-batch.repository.js';

interface SenderResolution {
  assignmentId: string | null;
  profile: SenderProfileRecord | null;
}

/**
 * Application service for the `outreach-drafter` module. Prepares an initial
 * outreach draft for an eligible lead, resolving the sender identity from the
 * product's assigned sender profile (owned by `sender-profiles`). It never sends,
 * and never invents an identity or a commercial claim.
 */
@Injectable()
export class OutreachDrafterService {
  constructor(
    @Inject(OutreachDraftRepository)
    private readonly repository: OutreachDraftRepository,
    @Inject(OutreachDecisionRepository)
    private readonly decisions: OutreachDecisionRepository,
    @Inject(OutreachBatchRepository)
    private readonly batches: OutreachBatchRepository,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(EvidenceService)
    private readonly evidence: EvidenceService,
    @Inject(ContactDiscoveryService)
    private readonly contacts: ContactDiscoveryService,
    @Inject(ResearchContextService)
    private readonly context: ResearchContextService,
    @Inject(ProductsAndOffersService)
    private readonly products: ProductsAndOffersService,
    @Inject(SenderProfilesService)
    private readonly senderProfiles: SenderProfilesService,
  ) {}

  async prepareDraft(
    opportunityId: string,
    leadId: string,
    input: PrepareOutreachDraftInput,
  ): Promise<OutreachDraftRecord> {
    const lead = await this.leads.getLead(opportunityId, leadId);

    // Human exclusion overrides agent qualification and the operator review:
    // an excluded company cannot be drafted for this scope.
    const decision = await this.decisions.find(opportunityId, lead.companyId);
    if (decision && isExcludingOutreachDecision(decision.decision)) {
      throw new ConflictException({
        error: 'lead_excluded_from_outreach',
        decision: decision.decision,
      });
    }

    if (lead.reviewStatus === 'REJECTED') {
      throw new ConflictException({ error: 'lead_rejected_by_operator' });
    }
    if (lead.agentQualificationStale || lead.needsReview) {
      throw new ConflictException({ error: 'lead_provenance_stale' });
    }
    if (
      lead.agentQualificationStatus !== 'QUALIFIED' &&
      lead.reviewStatus !== 'SHORTLISTED'
    ) {
      throw new ConflictException({ error: 'lead_not_eligible' });
    }

    const { contact, recipientRationale } =
      await this.contacts.selectRecipient(lead.companyId, input.contactId);

    const chosen = input.language
      ? {
          language: input.language,
          rationale: 'Language supplied with the preparation request.',
        }
      : selectLanguage(lead.company.country);

    let context: ResearchContext | null = null;
    try {
      context = await this.context.getResearchContext(opportunityId);
    } catch {
      context = null;
    }
    const offerSummary = input.offerSummary ?? context?.offer.name ?? null;

    // Sender identity is resolved from the product's assigned profile.
    const sender = await this.resolveSender(context?.product.id ?? null);

    const missingFields: string[] = [];
    if (!sender.assignmentId || !sender.profile) {
      missingFields.push('senderProfileNotAssigned');
    } else if (sender.profile.status !== 'ACTIVE') {
      missingFields.push('senderProfileDisabled');
    }
    if (!offerSummary) missingFields.push('offerSummary');
    if (!context) missingFields.push('offerContext');
    if (!contact || !contact.email) missingFields.push('recipientEmail');

    const activeProfile =
      sender.profile && sender.profile.status === 'ACTIVE'
        ? sender.profile
        : null;
    const senderSnapshot: SenderSnapshot | null = activeProfile
      ? {
          senderName: activeProfile.senderName,
          senderTitle: activeProfile.senderTitle,
          companyName: activeProfile.companyName,
          fromEmail: activeProfile.fromEmail,
          replyToEmail: activeProfile.replyToEmail,
          phone: activeProfile.phone,
          website: activeProfile.website,
          whatsappEnabled: activeProfile.whatsappEnabled,
          whatsappPhone: activeProfile.whatsappPhone,
          includeLogoInSignature: activeProfile.includeLogoInSignature,
          logoUrl: activeProfile.logoUrl,
        }
      : null;

    let subject: string | undefined;
    let body: string | undefined;
    let canonicalBody: string | undefined;
    let htmlBody: string | undefined;
    let preparationStatus: 'PREPARED' | 'BLOCKED' = 'BLOCKED';
    let rationale: string;

    if (
      missingFields.length === 0 &&
      contact?.email &&
      offerSummary &&
      context &&
      activeProfile
    ) {
      const content = buildDraftContent({
        language: chosen.language,
        companyName: lead.company.name,
        observedActivityText: lead.observedActivityText,
        offerSummary,
        productCategory: context?.product.category ?? null,
        senderName: activeProfile.senderName,
        senderTitle: activeProfile.senderTitle,
        senderCompany: activeProfile.companyName,
        senderPhone: activeProfile.phone,
        senderWebsite: activeProfile.website,
        senderEmail: activeProfile.fromEmail,
        whatsappEnabled: activeProfile.whatsappEnabled,
        whatsappPhone: activeProfile.whatsappPhone,
        includeLogoInSignature: activeProfile.includeLogoInSignature,
        logoUrl: activeProfile.logoUrl,
      });
      subject = content.subject;
      canonicalBody = content.canonicalBody;
      body = content.body;
      htmlBody = content.htmlBody;
      preparationStatus = 'PREPARED';
      rationale =
        `Prepared from opportunity context v${context.contextVersion} (offer: ${context.offer.name}) ` +
        `and the lead's CURRENT supporting evidence, using sender profile "${activeProfile.label}". ` +
        `${chosen.rationale} ${recipientRationale}`;
    } else {
      rationale =
        `Blocked: missing essential information (${missingFields.join(', ')}). ` +
        `${chosen.rationale} ${recipientRationale}`;
    }

    const fingerprint = this.fingerprint({
      opportunityId,
      leadId,
      contactId: contact?.id ?? null,
      preparationStatus,
      language: chosen.language,
      subject: subject ?? null,
      body: body ?? null,
      canonicalBody: canonicalBody ?? null,
      htmlBody: htmlBody ?? null,
      missingFields,
      contextVersion: context?.contextVersion ?? null,
      evidenceId: lead.evidenceId,
      claimId: lead.claimId,
      senderProfileId: activeProfile?.id ?? null,
      // Identity material only (never the password) participates in versioning.
      senderName: activeProfile?.senderName ?? null,
      senderTitle: activeProfile?.senderTitle ?? null,
      senderCompany: activeProfile?.companyName ?? null,
      fromEmail: activeProfile?.fromEmail ?? null,
      replyToEmail: activeProfile?.replyToEmail ?? null,
      phone: activeProfile?.phone ?? null,
      website: activeProfile?.website ?? null,
      whatsappEnabled: activeProfile?.whatsappEnabled ?? false,
      whatsappPhone: activeProfile?.whatsappPhone ?? null,
    });

    const existing = await this.repository.findByFingerprint(fingerprint);
    if (existing) {
      return this.toRecord(existing, lead, sender, decision);
    }

    const data: CreateDraftData = {
      opportunityId,
      leadId,
      companyId: lead.companyId,
      ...(contact ? { contactId: contact.id } : {}),
      ...(contact?.email ? { recipientEmail: contact.email } : {}),
      language: chosen.language,
      preparationStatus,
      ...(subject !== undefined ? { subject } : {}),
      ...(canonicalBody !== undefined ? { canonicalBody } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(htmlBody !== undefined ? { htmlBody } : {}),
      rationale,
      recipientRationale,
      missingFields,
      ...(context ? { contextVersion: context.contextVersion } : {}),
      evidenceId: lead.evidenceId,
      ...(lead.claimId ? { claimId: lead.claimId } : {}),
      sourceReferenceId: lead.sourceReferenceId,
      ...(activeProfile ? { senderProfileId: activeProfile.id } : {}),
      ...(activeProfile?.emailAccountId
        ? { emailAccountId: activeProfile.emailAccountId }
        : {}),
      ...(senderSnapshot ? { senderSnapshot } : {}),
      version: await this.repository.nextVersion(opportunityId, leadId),
      fingerprint,
    };
    return this.toRecord(
      await this.repository.createDraft(data),
      lead,
      sender,
      decision,
    );
  }

  async listDrafts(
    opportunityId: string,
    leadId: string,
  ): Promise<OutreachDraftRecord[]> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    const sender = await this.senderContextFor(opportunityId);
    const decision = await this.decisions.find(opportunityId, lead.companyId);
    const rows = await this.repository.listDrafts(opportunityId, leadId);
    return rows.map((row) => this.toRecord(row, lead, sender, decision));
  }

  /**
   * Read-only draft counts for the admin dashboard, by preparation status.
   * `total` counts persisted draft records (drafts are append-only/versioned).
   */
  async countDrafts(): Promise<{
    total: number;
    prepared: number;
    blocked: number;
  }> {
    const counts = await this.repository.countDraftsByPreparationStatus();
    return {
      total: counts.PREPARED + counts.BLOCKED,
      prepared: counts.PREPARED,
      blocked: counts.BLOCKED,
    };
  }

  async getDraft(
    opportunityId: string,
    leadId: string,
    draftId: string,
  ): Promise<OutreachDraftRecord> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    const sender = await this.senderContextFor(opportunityId);
    const row = await this.repository.findDraft(opportunityId, leadId, draftId);
    if (!row) {
      throw new NotFoundException({ error: 'outreach_draft_not_found' });
    }
    const decision = await this.decisions.find(opportunityId, lead.companyId);
    return this.toRecord(row, lead, sender, decision);
  }

  /**
   * Applies a human revision to a prepared draft. The canonical body (message
   * text WITHOUT the closing/signature) is the single editable source; the
   * sendable plain-text `body` and the `htmlBody` are deterministically
   * regenerated from it plus the draft's stored structured sender identity, so a
   * revision can never leave a stale HTML body paired with new plain text. A
   * revision creates a NEW append-only version; the previous version is never
   * rewritten, and no transport is involved.
   */
  async reviseDraft(
    opportunityId: string,
    leadId: string,
    draftId: string,
    input: ReviseOutreachDraftInput,
  ): Promise<OutreachDraftRecord> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    const sender = await this.senderContextFor(opportunityId);
    const decision = await this.decisions.find(opportunityId, lead.companyId);
    const row = await this.repository.findDraft(opportunityId, leadId, draftId);
    if (!row) {
      throw new NotFoundException({ error: 'outreach_draft_not_found' });
    }
    const snapshot = row.senderSnapshot as SenderSnapshot | null;
    if (
      row.preparationStatus !== 'PREPARED' ||
      !snapshot ||
      !row.canonicalBody
    ) {
      throw new ConflictException({ error: 'outreach_draft_not_editable' });
    }

    const subject = input.subject ?? row.subject ?? '';
    const canonicalBody = input.canonicalBody ?? row.canonicalBody;
    const identity: SenderIdentity = {
      senderName: snapshot.senderName,
      senderTitle: snapshot.senderTitle,
      senderCompany: snapshot.companyName,
      senderPhone: snapshot.phone,
      senderWebsite: snapshot.website,
      senderEmail: snapshot.fromEmail,
      whatsappEnabled: snapshot.whatsappEnabled,
      whatsappPhone: snapshot.whatsappPhone,
      includeLogoInSignature: snapshot.includeLogoInSignature,
      logoUrl: snapshot.logoUrl,
    };
    const { body, htmlBody } = composeOutreachBodies(
      row.language,
      canonicalBody,
      identity,
    );

    const fingerprint = this.fingerprint({
      opportunityId,
      leadId,
      contactId: row.contactId,
      preparationStatus: 'PREPARED',
      language: row.language,
      subject,
      canonicalBody,
      body,
      htmlBody,
      contextVersion: row.contextVersion,
      evidenceId: row.evidenceId,
      claimId: row.claimId,
      senderProfileId: row.senderProfileId,
      revisionOf: row.id,
      senderName: snapshot.senderName,
      senderTitle: snapshot.senderTitle,
      senderCompany: snapshot.companyName,
      fromEmail: snapshot.fromEmail,
      replyToEmail: snapshot.replyToEmail,
      phone: snapshot.phone,
      website: snapshot.website,
      whatsappEnabled: snapshot.whatsappEnabled,
      whatsappPhone: snapshot.whatsappPhone,
      includeLogoInSignature: snapshot.includeLogoInSignature,
      logoUrl: snapshot.logoUrl,
    });

    const existing = await this.repository.findByFingerprint(fingerprint);
    if (existing) {
      return this.toRecord(existing, lead, sender, decision);
    }

    const data: CreateDraftData = {
      opportunityId,
      leadId,
      companyId: lead.companyId,
      ...(row.contactId ? { contactId: row.contactId } : {}),
      ...(row.recipientEmail ? { recipientEmail: row.recipientEmail } : {}),
      language: row.language,
      preparationStatus: 'PREPARED',
      subject,
      canonicalBody,
      body,
      htmlBody,
      rationale: `${row.rationale} [human revision of v${row.version}]`,
      recipientRationale: row.recipientRationale,
      missingFields: [],
      ...(row.contextVersion !== null
        ? { contextVersion: row.contextVersion }
        : {}),
      ...(row.evidenceId ? { evidenceId: row.evidenceId } : {}),
      ...(row.claimId ? { claimId: row.claimId } : {}),
      ...(row.sourceReferenceId
        ? { sourceReferenceId: row.sourceReferenceId }
        : {}),
      ...(row.senderProfileId ? { senderProfileId: row.senderProfileId } : {}),
      ...(row.emailAccountId ? { emailAccountId: row.emailAccountId } : {}),
      senderSnapshot: snapshot,
      customized: true,
      ...(row.batchId ? { batchId: row.batchId } : {}),
      version: await this.repository.nextVersion(opportunityId, leadId),
      fingerprint,
    };
    const created = await this.repository.createDraft(data);
    // Deterministic re-approval rule: an edited draft is a new PENDING version.
    // If its batch was already approved, the batch returns to review.
    if (row.batchId) {
      const batch = await this.batches.findBatch(row.batchId);
      if (batch && batch.status !== 'DRAFT' && batch.status !== 'CANCELLED') {
        await this.batches.setStatus(batch.id, 'DRAFT', null);
      }
    }
    return this.toRecord(created, lead, sender, decision);
  }

  // --- Batch / campaign review ---------------------------------------------

  async listBatches(opportunityId: string): Promise<OutreachBatchRecord[]> {
    return this.batches.listBatches(opportunityId);
  }

  /**
   * Creates a batch and generates drafts for every currently eligible lead in
   * the opportunity scope (excluded/rejected/stale/unqualified and
   * no-recipient leads are skipped and counted). No per-recipient approval is
   * required; the batch is reviewed and approved as a whole.
   */
  async createBatch(
    opportunityId: string,
    input: CreateOutreachBatchInput,
  ): Promise<OutreachBatchSummary> {
    const leads = await this.leads.listLeads(opportunityId);
    const sender = await this.senderContextFor(opportunityId);
    const language =
      input.language ??
      selectLanguage(leads[0]?.company.country ?? null).language;
    const batch = await this.batches.createBatch({
      opportunityId,
      targetMarketId: input.targetMarketId ?? null,
      senderProfileId: input.senderProfileId ?? sender.assignmentId,
      language,
    });
    await this.generateIntoBatch(opportunityId, batch.id, language, leads);
    return this.composeBatchSummary(opportunityId, batch.id);
  }

  async getBatch(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachBatchSummary> {
    await this.requireBatch(opportunityId, batchId);
    return this.composeBatchSummary(opportunityId, batchId);
  }

  /**
   * Approves the whole batch in one action: freezes the exact version of every
   * prepared, still-pending draft (approval is per immutable version). Later
   * transport must send those frozen snapshots without regenerating content.
   */
  async approveBatch(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachBatchSummary> {
    const batch = await this.requireBatch(opportunityId, batchId);
    const summary = await this.composeBatchSummary(opportunityId, batchId);
    if (summary.counts.generatedDrafts === 0) {
      throw new ConflictException({ error: 'batch_has_no_drafts' });
    }
    await this.batches.approvePendingDrafts(batch.id);
    await this.batches.setStatus(batch.id, 'APPROVED', new Date());
    return this.composeBatchSummary(opportunityId, batch.id);
  }

  /**
   * Re-generates the batch's drafts from the current context/strategy while
   * preserving each lead's evidence-backed personalization. Individually
   * customized drafts and already-approved versions are never overwritten.
   */
  async regenerateBatch(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachBatchSummary> {
    const batch = await this.requireBatch(opportunityId, batchId);
    const leads = await this.leads.listLeads(opportunityId);
    const rows = await this.batches.listDraftRowsForBatch(batch.id);
    const latestByLead = new Map<string, BatchDraftRow>();
    for (const row of rows) {
      if (!latestByLead.has(row.leadId)) latestByLead.set(row.leadId, row);
    }
    const ids: string[] = [];
    for (const lead of leads) {
      const existing = latestByLead.get(lead.id);
      if (existing?.customized || existing?.approvalStatus === 'APPROVED') {
        continue;
      }
      if (!(await this.isDraftable(opportunityId, lead))) continue;
      const draft = await this.prepareDraft(opportunityId, lead.id, {
        language: batch.language,
      });
      if (draft.preparationStatus === 'PREPARED') ids.push(draft.id);
    }
    await this.batches.attachDrafts(batch.id, ids);
    if (batch.status !== 'DRAFT' && batch.status !== 'CANCELLED') {
      await this.batches.setStatus(batch.id, 'DRAFT', null);
    }
    return this.composeBatchSummary(opportunityId, batch.id);
  }

  private async generateIntoBatch(
    opportunityId: string,
    batchId: string,
    language: string,
    leads: LeadRecord[],
  ): Promise<void> {
    const ids: string[] = [];
    for (const lead of leads) {
      if (!(await this.isDraftable(opportunityId, lead))) continue;
      const draft = await this.prepareDraft(opportunityId, lead.id, {
        language,
      });
      if (draft.preparationStatus === 'PREPARED') ids.push(draft.id);
    }
    await this.batches.attachDrafts(batchId, ids);
  }

  /**
   * A lead is draftable when it is not human-excluded, not rejected/stale,
   * agent-qualified or shortlisted, and has a usable published recipient.
   */
  private async isDraftable(
    opportunityId: string,
    lead: LeadRecord,
  ): Promise<boolean> {
    const decision = await this.decisions.find(opportunityId, lead.companyId);
    if (decision && isExcludingOutreachDecision(decision.decision)) return false;
    if (
      lead.reviewStatus === 'REJECTED' ||
      lead.agentQualificationStale ||
      lead.needsReview
    ) {
      return false;
    }
    if (
      lead.agentQualificationStatus !== 'QUALIFIED' &&
      lead.reviewStatus !== 'SHORTLISTED'
    ) {
      return false;
    }
    const recipient = await this.contacts.selectRecipient(lead.companyId);
    return Boolean(recipient.contact?.email);
  }

  private async requireBatch(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachBatchRecord> {
    const batch = await this.batches.findBatch(batchId);
    if (!batch || batch.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'outreach_batch_not_found' });
    }
    return batch;
  }

  private async composeBatchSummary(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachBatchSummary> {
    const batch = await this.requireBatch(opportunityId, batchId);
    const leads = await this.leads.listLeads(opportunityId);
    const sender = await this.senderContextFor(opportunityId);

    const counts: OutreachBatchCounts = {
      eligibleLeads: 0,
      excludedByDecision: 0,
      withoutRecipient: 0,
      generatedDrafts: 0,
      approvedDrafts: 0,
      pendingDrafts: 0,
    };
    for (const lead of leads) {
      const decision = await this.decisions.find(opportunityId, lead.companyId);
      if (decision && isExcludingOutreachDecision(decision.decision)) {
        counts.excludedByDecision += 1;
        continue;
      }
      if (
        lead.reviewStatus === 'REJECTED' ||
        lead.agentQualificationStale ||
        lead.needsReview
      ) {
        continue;
      }
      if (
        lead.agentQualificationStatus !== 'QUALIFIED' &&
        lead.reviewStatus !== 'SHORTLISTED'
      ) {
        continue;
      }
      counts.eligibleLeads += 1;
      const recipient = await this.contacts.selectRecipient(lead.companyId);
      if (!recipient.contact?.email) counts.withoutRecipient += 1;
    }

    const rows = await this.batches.listDraftRowsForBatch(batchId);
    const drafts: OutreachDraftRecord[] = [];
    for (const row of rows) {
      const lead = await this.leads.getLead(opportunityId, row.leadId);
      const decision = await this.decisions.find(opportunityId, lead.companyId);
      drafts.push(this.toRecord(row, lead, sender, decision));
    }
    const prepared = drafts.filter((d) => d.preparationStatus === 'PREPARED');
    counts.generatedDrafts = prepared.length;
    counts.approvedDrafts = prepared.filter(
      (d) => d.approvalStatus === 'APPROVED',
    ).length;
    counts.pendingDrafts = prepared.filter(
      (d) => d.approvalStatus === 'PENDING',
    ).length;

    const representative: OutreachBatchPreview[] = prepared
      .slice(0, 3)
      .map((draft) => ({
        draftId: draft.id,
        leadId: draft.leadId,
        recipientEmail: draft.recipientEmail,
        subject: draft.subject,
        bodyExcerpt: (draft.body ?? '').slice(0, 160),
      }));

    return { batch, counts, drafts, representative };
  }

  /**
   * The human outreach decision for one (opportunity, company) scope, or null
   * when none has been recorded (treated as eligible). This is the single
   * authoritative source; a lead is never required.
   */
  async getDecisionForCompany(
    opportunityId: string,
    companyId: string,
  ): Promise<OutreachDecisionRecord | null> {
    return this.decisions.find(opportunityId, companyId);
  }

  /**
   * Records a human outreach decision for one (opportunity, company) scope.
   * Human provenance is persisted (`HUMAN` + `decidedAt`); it never changes
   * research evidence or the agent qualification.
   */
  async setDecisionForCompany(
    opportunityId: string,
    companyId: string,
    input: SetOutreachDecisionInput,
  ): Promise<OutreachDecisionRecord> {
    return this.decisions.upsert(opportunityId, companyId, {
      decision: input.decision,
      ...(input.note !== undefined ? { note: input.note } : {}),
    });
  }

  /**
   * Reads the decision for a research offering's company (opportunity+company
   * scoped, lead-independent). Returns null when the offering has no company or
   * none is recorded yet. Read-only — never creates a company.
   */
  async getDecisionForOffering(
    opportunityId: string,
    offeringId: string,
  ): Promise<OutreachDecisionRecord | null> {
    const companyId = await this.resolveOfferingCompanyId(
      opportunityId,
      offeringId,
      false,
    );
    return companyId ? this.decisions.find(opportunityId, companyId) : null;
  }

  /**
   * Records a human decision for a research offering's company. Must work even
   * when no lead/company exists yet, so a minimal company identity is resolved
   * or created (idempotent, human-initiated) and the decision is stored against
   * the same (opportunity, company) key the drafting gate reads.
   */
  async setDecisionForOffering(
    opportunityId: string,
    offeringId: string,
    input: SetOutreachDecisionInput,
  ): Promise<OutreachDecisionRecord> {
    const companyId = await this.resolveOfferingCompanyId(
      opportunityId,
      offeringId,
      true,
    );
    if (!companyId) {
      throw new BadRequestException({ error: 'offering_company_missing' });
    }
    return this.setDecisionForCompany(opportunityId, companyId, input);
  }

  private async resolveOfferingCompanyId(
    opportunityId: string,
    offeringId: string,
    create: boolean,
  ): Promise<string | null> {
    const offering = await this.evidence.getOffering(opportunityId, offeringId);
    const name = offering.companyText?.trim();
    if (!name) return null;
    const country = offering.companyLocationText;
    const company = create
      ? await this.leads.ensureCompanyByName(name, country)
      : await this.leads.resolveCompanyByName(name, country);
    return company?.id ?? null;
  }

  private async resolveSender(
    productId: string | null,
  ): Promise<SenderResolution> {
    if (!productId) return { assignmentId: null, profile: null };
    const product = await this.products.getProduct(productId);
    // Buyer outreach uses only the product's outreach sender; the inquiry
    // sender is a separate context and is never consulted here.
    const assignmentId = product?.outreachSenderProfileId ?? null;
    const profile = assignmentId
      ? await this.senderProfiles.getProfile(assignmentId)
      : null;
    return { assignmentId, profile };
  }

  private async senderContextFor(
    opportunityId: string,
  ): Promise<SenderResolution> {
    try {
      const context = await this.context.getResearchContext(opportunityId);
      return await this.resolveSender(context.product.id);
    } catch {
      return { assignmentId: null, profile: null };
    }
  }

  private toRecord(
    row: OutreachDraftRow,
    lead: LeadRecord,
    sender: SenderResolution,
    decision: OutreachDecisionRecord | null,
  ): OutreachDraftRecord {
    const staleReasons: string[] = [];
    if (lead.agentQualificationStale || lead.needsReview) {
      staleReasons.push(
        'Lead qualification is stale (finding replaced/retracted or provenance changed); reassessment required.',
      );
    }
    if (lead.reviewStatus === 'REJECTED') {
      staleReasons.push('Lead was rejected by the operator.');
    }
    if (decision && isExcludingOutreachDecision(decision.decision)) {
      staleReasons.push(
        `Excluded from outreach by a human decision (${decision.decision}).`,
      );
    }
    if (
      row.contactId &&
      (!row.contact || row.contact.usabilityStatus === 'UNUSABLE')
    ) {
      staleReasons.push('The selected recipient contact is no longer usable.');
    }

    const snapshot = row.senderSnapshot as SenderSnapshot | null;
    if (row.senderProfileId) {
      if (row.senderProfileId !== sender.assignmentId) {
        staleReasons.push(
          "The product's sender profile assignment changed since this draft was prepared.",
        );
      } else if (!sender.profile) {
        staleReasons.push('The assigned sender profile was removed.');
      } else if (sender.profile.status !== 'ACTIVE') {
        staleReasons.push('The assigned sender profile is disabled.');
      } else if (
        snapshot &&
        (snapshot.senderName !== sender.profile.senderName ||
          snapshot.senderTitle !== sender.profile.senderTitle ||
          snapshot.companyName !== sender.profile.companyName ||
          snapshot.fromEmail !== sender.profile.fromEmail ||
          snapshot.replyToEmail !== sender.profile.replyToEmail ||
          snapshot.phone !== sender.profile.phone ||
          snapshot.website !== sender.profile.website ||
          snapshot.whatsappEnabled !== sender.profile.whatsappEnabled ||
          snapshot.whatsappPhone !== sender.profile.whatsappPhone ||
          snapshot.includeLogoInSignature !==
            sender.profile.includeLogoInSignature ||
          snapshot.logoUrl !== sender.profile.logoUrl)
      ) {
        staleReasons.push(
          'The sender identity changed since this draft was prepared.',
        );
      } else if (
        row.emailAccountId !== null &&
        row.emailAccountId !== sender.profile.emailAccountId
      ) {
        staleReasons.push(
          'The sender email account changed since this draft was prepared.',
        );
      }
    }

    return {
      id: row.id,
      opportunityId: row.opportunityId,
      leadId: row.leadId,
      companyId: row.companyId,
      contactId: row.contactId,
      recipientEmail: row.recipientEmail,
      language: row.language,
      preparationStatus: row.preparationStatus,
      subject: row.subject,
      body: row.body,
      canonicalBody: row.canonicalBody,
      htmlBody: row.htmlBody,
      rationale: row.rationale,
      recipientRationale: row.recipientRationale,
      missingFields: row.missingFields ?? [],
      contextVersion: row.contextVersion,
      evidenceId: row.evidenceId,
      claimId: row.claimId,
      sourceReferenceId: row.sourceReferenceId,
      senderProfileId: row.senderProfileId,
      emailAccountId: row.emailAccountId,
      senderSnapshot: snapshot,
      version: row.version,
      batchId: row.batchId,
      customized: row.customized,
      approvalStatus: row.approvalStatus,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      inputsStale: staleReasons.length > 0,
      staleReasons,
    };
  }

  private fingerprint(parts: Record<string, unknown>): string {
    const canonical = Object.keys(parts)
      .sort()
      .map((key) => {
        const value = parts[key];
        return `${key}=${Array.isArray(value) ? [...value].sort().join(',') : (value ?? '')}`;
      })
      .join('\u001F');
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}
