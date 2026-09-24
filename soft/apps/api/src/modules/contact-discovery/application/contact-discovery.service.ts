import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateContactInput, UpdateContactInput } from '@ai-sdr/contracts';
import { EvidenceService } from '../../evidence/application/evidence.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import type { ContactRecord, CreateContactData } from '../domain/types.js';
import { ContactRepository } from '../infrastructure/contact.repository.js';

/** A published purchasing/procurement/specification role (generic keywords). */
const RELEVANT_ROLE_PATTERN =
  /(procure|purchas|buyer|sourcing|supply ?chain|import|einkauf|pirkim|iepirk|hank|ostu|ostja)/i;

export interface RecipientSelection {
  contact: ContactRecord | null;
  recipientRationale: string;
}

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

  /**
   * Shared recipient selection for outreach and price inquiries. Considers only
   * **usable** contacts with a **published** email; prefers a named person whose
   * published title is explicitly relevant to purchasing/procurement, otherwise
   * the earliest general company business email. It never infers a person's
   * responsibility, and returns `contact: null` when nothing usable exists.
   *
   * The `recipientRationale` is a short human-readable explanation of the
   * selection (persisted alongside the draft).
   */
  async selectRecipient(
    companyId: string,
    requestedContactId?: string,
  ): Promise<RecipientSelection> {
    const usable = (await this.listContacts(companyId)).filter(
      (contact) => contact.usabilityStatus === 'USABLE' && contact.email,
    );

    if (requestedContactId) {
      const requested = usable.find(
        (contact) => contact.id === requestedContactId,
      );
      if (!requested) {
        throw new BadRequestException({
          error: 'contact_not_usable_or_missing_email',
        });
      }
      return {
        contact: requested,
        recipientRationale:
          'Operator-specified recipient (usable, published email).',
      };
    }

    const named = usable
      .filter(
        (contact) =>
          contact.contactType === 'NAMED_PERSON' &&
          contact.personJobTitle !== null &&
          RELEVANT_ROLE_PATTERN.test(contact.personJobTitle),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (named.length > 0) {
      const contact = named[0] as ContactRecord;
      return {
        contact,
        recipientRationale: `Named contact with a published role relevant to purchasing (${contact.personJobTitle}).`,
      };
    }

    const general = usable
      .filter((contact) => contact.contactType === 'GENERAL_COMPANY')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (general) {
      return {
        contact: general,
        recipientRationale:
          'No named contact publishes a role relevant to purchasing; used the general company business email.',
      };
    }

    return {
      contact: null,
      recipientRationale:
        'No usable published business email is recorded for this company.',
    };
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
