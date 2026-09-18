import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import {
  contactDedupKey,
  normalizeEmail,
  normalizePageUrl,
  normalizePhone,
} from '../domain/normalize.js';
import type {
  ContactRecord,
  ContactSourceRecord,
  CreateContactData,
  UpdateContactData,
} from '../domain/types.js';

const CONTACT_INCLUDE = {
  sources: {
    include: { sourceReference: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.ContactInclude;

type ContactWithSources = Prisma.ContactGetPayload<{
  include: typeof CONTACT_INCLUDE;
}>;

function toSourceRecord(
  source: ContactWithSources['sources'][number],
): ContactSourceRecord {
  return {
    id: source.id,
    sourceReferenceId: source.sourceReferenceId,
    url: source.sourceReference.url,
    title: source.sourceReference.title,
    publisher: source.sourceReference.publisher,
    sourceType: source.sourceReference.sourceType,
    retrievedAt: source.retrievedAt,
    excerptText: source.excerptText,
  };
}

function toContactRecord(row: ContactWithSources): ContactRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    contactType: row.contactType,
    email: row.email,
    phone: row.phone,
    contactPageUrl: row.contactPageUrl,
    personName: row.personName,
    personJobTitle: row.personJobTitle,
    usabilityStatus: row.usabilityStatus,
    unusableReason: row.unusableReason,
    deliverabilityStatus: row.deliverabilityStatus,
    unknownsText: row.unknownsText,
    normalizedEmail: row.normalizedEmail,
    normalizedPhone: row.normalizedPhone,
    dedupKey: row.dedupKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sources: row.sources.map(toSourceRecord),
  };
}

export interface UpsertedContactSource {
  contactId: string;
  sourceReferenceId: string;
  retrievedAt: Date;
  excerptText: string;
}

/**
 * Typed repository scoped to the tables owned by `contact-discovery`:
 * `contacts` and `contact_sources`. `source_references` is read/written through
 * the `evidence` service, never here.
 */
@Injectable()
export class ContactRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * Idempotently creates or refreshes a contact. Identity is company + type +
   * strongest normalized channel (+ name for a person); the source is attached
   * as a separate provenance row so many sources accumulate without overwriting.
   * Original values are stored unchanged.
   */
  async createContact(data: CreateContactData): Promise<ContactRecord> {
    const normalizedEmail =
      data.email !== undefined ? normalizeEmail(data.email) : null;
    const normalizedPhone =
      data.phone !== undefined ? normalizePhone(data.phone) : null;
    const normalizedPageUrl =
      data.contactPageUrl !== undefined
        ? normalizePageUrl(data.contactPageUrl)
        : null;
    const dedupKey = contactDedupKey({
      companyId: data.companyId,
      contactType: data.contactType,
      normalizedEmail,
      normalizedPhone,
      normalizedPageUrl,
      personName: data.personName ?? null,
    });

    const identityFields = {
      contactType: data.contactType,
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.contactPageUrl !== undefined
        ? { contactPageUrl: data.contactPageUrl }
        : {}),
      ...(data.personName !== undefined ? { personName: data.personName } : {}),
      ...(data.personJobTitle !== undefined
        ? { personJobTitle: data.personJobTitle }
        : {}),
      ...(data.unknownsText !== undefined
        ? { unknownsText: data.unknownsText }
        : {}),
      ...(data.deliverabilityStatus !== undefined
        ? { deliverabilityStatus: data.deliverabilityStatus }
        : {}),
      normalizedEmail,
      normalizedPhone,
    };

    return this.prisma.db.$transaction(async (tx) => {
      const contact = await tx.contact.upsert({
        where: { dedupKey },
        create: {
          companyId: data.companyId,
          dedupKey,
          ...identityFields,
        },
        update: identityFields,
      });

      await tx.contactSource.upsert({
        where: {
          contactId_sourceReferenceId: {
            contactId: contact.id,
            sourceReferenceId: data.source.sourceReferenceId,
          },
        },
        create: {
          contactId: contact.id,
          sourceReferenceId: data.source.sourceReferenceId,
          retrievedAt: data.source.retrievedAt,
          excerptText: data.source.excerptText,
        },
        update: {
          retrievedAt: data.source.retrievedAt,
          excerptText: data.source.excerptText,
        },
      });

      const full = await tx.contact.findUniqueOrThrow({
        where: { id: contact.id },
        include: CONTACT_INCLUDE,
      });
      return toContactRecord(full);
    });
  }

  async listContacts(companyId: string): Promise<ContactRecord[]> {
    const rows = await this.prisma.db.contact.findMany({
      where: { companyId },
      include: CONTACT_INCLUDE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toContactRecord);
  }

  async findContact(
    companyId: string,
    contactId: string,
  ): Promise<ContactRecord | null> {
    const row = await this.prisma.db.contact.findFirst({
      where: { id: contactId, companyId },
      include: CONTACT_INCLUDE,
    });
    return row ? toContactRecord(row) : null;
  }

  /** Usability/deliverability only; contact values and provenance are untouched. */
  async updateContact(
    contactId: string,
    data: UpdateContactData,
  ): Promise<ContactRecord> {
    const usable = data.usabilityStatus === 'USABLE';
    const row = await this.prisma.db.contact.update({
      where: { id: contactId },
      data: {
        usabilityStatus: data.usabilityStatus,
        unusableReason: usable ? null : (data.unusableReason ?? null),
        ...(data.deliverabilityStatus !== undefined
          ? { deliverabilityStatus: data.deliverabilityStatus }
          : {}),
      },
      include: CONTACT_INCLUDE,
    });
    return toContactRecord(row);
  }
}
