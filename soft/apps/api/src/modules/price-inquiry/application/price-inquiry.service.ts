import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePriceInquiryDraftInput,
  UpdatePriceInquiryDraftInput,
} from '@ai-sdr/contracts';
import { ContactDiscoveryService } from '../../contact-discovery/application/contact-discovery.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import type { LeadRecord } from '../../lead-discoverer/domain/types.js';
import { ProductsAndOffersService } from '../../products-and-offers/application/products-and-offers.service.js';
import { SenderProfilesService } from '../../sender-profiles/application/sender-profiles.service.js';
import type { SenderProfileRecord } from '../../sender-profiles/domain/types.js';
import {
  buildPriceInquiryContent,
  buildSpecification,
  resolvePriceInquiryLocale,
} from '../domain/content.js';
import type {
  CreatePriceInquiryDraftData,
  PriceInquiryDraftRecord,
  SenderSnapshot,
  UpdatePriceInquiryDraftData,
} from '../domain/types.js';
import {
  PriceInquiryRepository,
  type PriceInquiryDraftRow,
} from '../infrastructure/price-inquiry.repository.js';

/** Price inquiries currently implement the English generator (see domain/content). */

/**
 * Application service for the `price-inquiry` module: a persisted, reviewable
 * RFQ draft. It never sends mail and never invokes any transport. Eligibility
 * mirrors the established outreach rules; sender identity must be an active
 * profile linked to an email account.
 */
@Injectable()
export class PriceInquiryService {
  constructor(
    @Inject(PriceInquiryRepository)
    private readonly repository: PriceInquiryRepository,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(ContactDiscoveryService)
    private readonly contacts: ContactDiscoveryService,
    @Inject(ProductsAndOffersService)
    private readonly products: ProductsAndOffersService,
    @Inject(SenderProfilesService)
    private readonly senderProfiles: SenderProfilesService,
  ) {}

  async createDraft(
    opportunityId: string,
    leadId: string,
    input: CreatePriceInquiryDraftInput,
  ): Promise<PriceInquiryDraftRecord> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    this.assertOutreachEligible(lead);

    const product = await this.products.getProduct(input.productId);
    if (!product) {
      throw new BadRequestException({ error: 'product_not_found' });
    }
    const facts = await this.products.getFactsForProduct(product.id);
    const specification = buildSpecification(product, facts);

    const { contact, recipientRationale } =
      await this.contacts.selectRecipient(lead.companyId, input.contactId);
    if (!contact || !contact.email) {
      throw new ConflictException({ error: 'recipient_required' });
    }

    // Sender resolution: an explicit human selection wins; otherwise the
    // product's **inquiry** sender is used. The outreach sender is a separate
    // context and is never a fallback.
    const selectedSenderProfileId =
      input.senderProfileId ?? product.inquirySenderProfileId ?? null;
    if (!selectedSenderProfileId) {
      throw new ConflictException({ error: 'inquiry_sender_profile_required' });
    }
    const profile = await this.resolveUsableSender(selectedSenderProfileId);

    const language = resolvePriceInquiryLocale(input.language);
    const content = buildPriceInquiryContent({
      locale: language,
      productName: product.name,
      specificationLines: specification.lines,
      recipientName:
        contact.contactType === 'NAMED_PERSON' ? contact.personName : null,
      senderName: profile.senderName,
      senderTitle: profile.senderTitle,
      senderCompany: profile.companyName,
    });
    const senderSnapshot = this.snapshot(profile);

    const fingerprint = this.fingerprint({
      opportunityId,
      leadId,
      productId: product.id,
      contactId: contact.id,
      recipientEmail: contact.email,
      senderProfileId: profile.id,
      senderName: profile.senderName,
      senderCompany: profile.companyName,
      fromEmail: profile.fromEmail,
      replyToEmail: profile.replyToEmail,
      signature: profile.signature,
      specificationSummary: specification.summary,
      language,
      subject: content.subject,
      body: content.body,
    });

    const existing = await this.repository.findByFingerprint(fingerprint);
    if (existing) {
      return this.toRecord(existing, lead, profile);
    }

    const rationale =
      `Price inquiry generated from the persisted specification of "${product.name}" and the ` +
      `lead's provenance, using sender profile "${profile.label}". ${recipientRationale}`;

    const data: CreatePriceInquiryDraftData = {
      opportunityId,
      leadId,
      companyId: lead.companyId,
      productId: product.id,
      contactId: contact.id,
      recipientEmail: contact.email,
      recipientRationale,
      senderProfileId: profile.id,
      emailAccountId: profile.emailAccountId,
      senderSnapshot,
      language,
      subject: content.subject,
      body: content.body,
      generatedSubject: content.subject,
      generatedBody: content.body,
      specificationSummary: specification.summary,
      rationale,
      evidenceId: lead.evidenceId,
      claimId: lead.claimId,
      sourceReferenceId: lead.sourceReferenceId,
      fingerprint,
    };

    return this.toRecord(await this.repository.create(data), lead, profile);
  }

  async listDrafts(
    opportunityId: string,
    leadId: string,
  ): Promise<PriceInquiryDraftRecord[]> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    const rows = await this.repository.listDrafts(opportunityId, leadId);
    const cache = new Map<string, SenderProfileRecord | null>();
    const records: PriceInquiryDraftRecord[] = [];
    for (const row of rows) {
      records.push(this.toRecord(row, lead, await this.resolveCached(row, cache)));
    }
    return records;
  }

  async getDraft(
    opportunityId: string,
    leadId: string,
    draftId: string,
  ): Promise<PriceInquiryDraftRecord> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    const row = await this.repository.findDraft(opportunityId, leadId, draftId);
    if (!row) {
      throw new NotFoundException({ error: 'price_inquiry_draft_not_found' });
    }
    return this.toRecord(row, lead, await this.resolveCached(row, new Map()));
  }

  async updateDraft(
    opportunityId: string,
    leadId: string,
    draftId: string,
    input: UpdatePriceInquiryDraftInput,
  ): Promise<PriceInquiryDraftRecord> {
    const lead = await this.leads.getLead(opportunityId, leadId);
    const row = await this.repository.findDraft(opportunityId, leadId, draftId);
    if (!row) {
      throw new NotFoundException({ error: 'price_inquiry_draft_not_found' });
    }

    const data: UpdatePriceInquiryDraftData = {};
    if (input.subject !== undefined) data.subject = input.subject;
    if (input.body !== undefined) data.body = input.body;
    if (input.recipientEmail !== undefined) {
      data.recipientEmail = input.recipientEmail;
    }

    if (input.contactId !== undefined) {
      if (input.contactId === null) {
        data.contactId = null;
      } else {
        const { contact } = await this.contacts.selectRecipient(
          row.companyId,
          input.contactId,
        );
        if (!contact || !contact.email) {
          throw new BadRequestException({
            error: 'contact_not_usable_or_missing_email',
          });
        }
        data.contactId = contact.id;
        data.recipientEmail = contact.email;
      }
    }

    let profile = await this.resolveCached(row, new Map());
    if (input.senderProfileId !== undefined) {
      if (input.senderProfileId === null) {
        throw new BadRequestException({ error: 'sender_profile_required' });
      }
      profile = await this.resolveUsableSender(input.senderProfileId);
      data.senderProfileId = profile.id;
      data.emailAccountId = profile.emailAccountId;
      data.senderSnapshot = this.snapshot(profile);
    }

    const updated = await this.repository.updateDraft(draftId, data);
    return this.toRecord(updated, lead, profile);
  }

  /** Established outreach eligibility: not rejected, not stale, and qualified. */
  private assertOutreachEligible(lead: LeadRecord): void {
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
  }

  /** Resolves an ACTIVE sender profile linked to an email account. */
  private async resolveUsableSender(
    senderProfileId: string | null,
  ): Promise<SenderProfileRecord> {
    if (!senderProfileId) {
      throw new ConflictException({ error: 'sender_profile_required' });
    }
    const profile = await this.senderProfiles.getProfile(senderProfileId);
    if (!profile) {
      throw new BadRequestException({ error: 'sender_profile_not_found' });
    }
    if (profile.status !== 'ACTIVE') {
      throw new ConflictException({ error: 'sender_profile_disabled' });
    }
    if (!profile.emailAccountId) {
      throw new ConflictException({ error: 'sender_profile_not_linked' });
    }
    return profile;
  }

  private async resolveCached(
    row: PriceInquiryDraftRow,
    cache: Map<string, SenderProfileRecord | null>,
  ): Promise<SenderProfileRecord | null> {
    if (!row.senderProfileId) return null;
    const cached = cache.get(row.senderProfileId);
    if (cached !== undefined) return cached;
    const profile = await this.senderProfiles.getProfile(row.senderProfileId);
    cache.set(row.senderProfileId, profile);
    return profile;
  }

  private snapshot(profile: SenderProfileRecord): SenderSnapshot {
    return {
      senderName: profile.senderName,
      senderTitle: profile.senderTitle,
      companyName: profile.companyName,
      fromEmail: profile.fromEmail,
      replyToEmail: profile.replyToEmail,
      signature: profile.signature,
    };
  }

  private toRecord(
    row: PriceInquiryDraftRow,
    lead: LeadRecord,
    profile: SenderProfileRecord | null,
  ): PriceInquiryDraftRecord {
    const staleReasons: string[] = [];
    if (lead.agentQualificationStale || lead.needsReview) {
      staleReasons.push(
        'Lead qualification is stale (finding replaced/retracted or provenance changed); reassessment required.',
      );
    }
    if (lead.reviewStatus === 'REJECTED') {
      staleReasons.push('Lead was rejected by the operator.');
    }
    if (
      row.contactId &&
      (!row.contact || row.contact.usabilityStatus === 'UNUSABLE')
    ) {
      staleReasons.push('The selected recipient contact is no longer usable.');
    }

    const snapshot = (row.senderSnapshot as SenderSnapshot | null) ?? null;
    if (row.senderProfileId) {
      if (!profile) {
        staleReasons.push('The selected sender profile was removed.');
      } else if (profile.status !== 'ACTIVE') {
        staleReasons.push('The selected sender profile is disabled.');
      } else if (
        snapshot &&
        (snapshot.senderName !== profile.senderName ||
          snapshot.companyName !== profile.companyName ||
          snapshot.fromEmail !== profile.fromEmail ||
          snapshot.replyToEmail !== profile.replyToEmail ||
          snapshot.signature !== profile.signature)
      ) {
        staleReasons.push(
          'The sender identity changed since this draft was prepared.',
        );
      } else if (
        row.emailAccountId !== null &&
        row.emailAccountId !== profile.emailAccountId
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
      productId: row.productId,
      contactId: row.contactId,
      recipientEmail: row.recipientEmail,
      recipientRationale: row.recipientRationale,
      senderProfileId: row.senderProfileId,
      emailAccountId: row.emailAccountId,
      senderSnapshot: snapshot,
      purpose: row.purpose,
      status: row.status,
      language: row.language,
      subject: row.subject,
      body: row.body,
      generatedSubject: row.generatedSubject,
      generatedBody: row.generatedBody,
      specificationSummary: row.specificationSummary,
      rationale: row.rationale,
      sourceReferenceId: row.sourceReferenceId,
      evidenceId: row.evidenceId,
      claimId: row.claimId,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      inputsStale: staleReasons.length > 0,
      staleReasons,
    };
  }

  private fingerprint(parts: Record<string, unknown>): string {
    const canonical = Object.keys(parts)
      .sort()
      .map((key) => {
        const value = parts[key];
        return `${key}=${value ?? ''}`;
      })
      .join('\u001F');
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}
