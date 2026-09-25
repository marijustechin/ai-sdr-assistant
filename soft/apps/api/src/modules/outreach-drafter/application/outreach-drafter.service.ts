import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  PrepareOutreachDraftInput,
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
import { buildDraftContent } from '../domain/content.js';
import { isExcludingOutreachDecision } from '../domain/decisions.js';
import { selectLanguage } from '../domain/language.js';
import type {
  CreateDraftData,
  OutreachDecisionRecord,
  OutreachDraftRecord,
  SenderSnapshot,
} from '../domain/types.js';
import {
  OutreachDraftRepository,
  type OutreachDraftRow,
} from '../infrastructure/outreach-draft.repository.js';
import { OutreachDecisionRepository } from '../infrastructure/outreach-decision.repository.js';

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
