import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateContactInput, UpdateContactInput } from '@ai-sdr/contracts';
import { EvidenceService } from '../../evidence/application/evidence.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import type { ContactRecord, CreateContactData } from '../domain/types.js';
import { ContactRepository } from '../infrastructure/contact.repository.js';

/**
 * Application service for the `contact-discovery` module. Owns `contacts` and
 * `contact_sources`; reads the company from `lead-discoverer` and get-or-creates
 * source references through `evidence`. It never touches research runs, lead
 * buyer-fit evidence, or review states.
 */
@Injectable()
export class ContactDiscoveryService {
  constructor(
    @Inject(ContactRepository)
    private readonly repository: ContactRepository,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(EvidenceService)
    private readonly evidence: EvidenceService,
  ) {}

  async createContact(
    companyId: string,
    input: CreateContactInput,
  ): Promise<ContactRecord> {
    await this.leads.getCompany(companyId);

    const source = await this.evidence.getOrCreateSource({
      url: input.source.url,
      ...(input.source.title !== undefined ? { title: input.source.title } : {}),
      ...(input.source.publisher !== undefined
        ? { publisher: input.source.publisher }
        : {}),
      ...(input.source.sourceType !== undefined
        ? { sourceType: input.source.sourceType }
        : {}),
    });

    const data: CreateContactData = {
      companyId,
      contactType: input.contactType,
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.contactPageUrl !== undefined
        ? { contactPageUrl: input.contactPageUrl }
        : {}),
      ...(input.personName !== undefined
        ? { personName: input.personName }
        : {}),
      ...(input.personJobTitle !== undefined
        ? { personJobTitle: input.personJobTitle }
        : {}),
      ...(input.unknownsText !== undefined
        ? { unknownsText: input.unknownsText }
        : {}),
      ...(input.deliverabilityStatus !== undefined
        ? { deliverabilityStatus: input.deliverabilityStatus }
        : {}),
      source: {
        sourceReferenceId: source.id,
        retrievedAt: input.source.retrievedAt,
        excerptText: input.source.excerptText,
      },
    };
    return this.repository.createContact(data);
  }

  async listContacts(companyId: string): Promise<ContactRecord[]> {
    await this.leads.getCompany(companyId);
    return this.repository.listContacts(companyId);
  }

  async updateContact(
    companyId: string,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactRecord> {
    await this.leads.getCompany(companyId);
    const existing = await this.repository.findContact(companyId, contactId);
    if (!existing) {
      throw new NotFoundException({ error: 'contact_not_found' });
    }
    return this.repository.updateContact(contactId, {
      usabilityStatus: input.usabilityStatus,
      ...(input.unusableReason !== undefined
        ? { unusableReason: input.unusableReason }
        : {}),
      ...(input.deliverabilityStatus !== undefined
        ? { deliverabilityStatus: input.deliverabilityStatus }
        : {}),
    });
  }
}
