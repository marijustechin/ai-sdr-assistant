import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type {
  CreatePriceInquiryDraftData,
  PriceInquiryStatus,
  SenderSnapshot,
  UpdatePriceInquiryDraftData,
} from '../domain/types.js';

const INCLUDE = { contact: true } satisfies Prisma.PriceInquiryDraftInclude;

export type PriceInquiryDraftRow = Prisma.PriceInquiryDraftGetPayload<{
  include: typeof INCLUDE;
}>;

export function toSenderSnapshot(row: {
  senderSnapshot: Prisma.JsonValue | null;
}): SenderSnapshot | null {
  return (row.senderSnapshot as SenderSnapshot | null) ?? null;
}

/**
 * Typed repository scoped to the table owned by `price-inquiry`:
 * `price_inquiry_drafts`. The unique `fingerprint` makes a create with identical
 * inputs idempotent.
 */
@Injectable()
export class PriceInquiryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async create(data: CreatePriceInquiryDraftData): Promise<PriceInquiryDraftRow> {
    return this.prisma.db.priceInquiryDraft.create({
      data: {
        opportunityId: data.opportunityId,
        leadId: data.leadId,
        companyId: data.companyId,
        productId: data.productId,
        contactId: data.contactId ?? null,
        recipientEmail: data.recipientEmail ?? null,
        recipientRationale: data.recipientRationale,
        senderProfileId: data.senderProfileId ?? null,
        emailAccountId: data.emailAccountId ?? null,
        senderSnapshot:
          data.senderSnapshot === undefined || data.senderSnapshot === null
            ? Prisma.DbNull
            : (data.senderSnapshot as unknown as Prisma.InputJsonValue),
        language: data.language,
        subject: data.subject,
        body: data.body,
        generatedSubject: data.generatedSubject,
        generatedBody: data.generatedBody,
        specificationSummary: data.specificationSummary,
        rationale: data.rationale,
        sourceReferenceId: data.sourceReferenceId ?? null,
        evidenceId: data.evidenceId ?? null,
        claimId: data.claimId ?? null,
        fingerprint: data.fingerprint,
      },
      include: INCLUDE,
    });
  }

  async findByFingerprint(
    fingerprint: string,
  ): Promise<PriceInquiryDraftRow | null> {
    return this.prisma.db.priceInquiryDraft.findUnique({
      where: { fingerprint },
      include: INCLUDE,
    });
  }

  async listDrafts(
    opportunityId: string,
    leadId: string,
  ): Promise<PriceInquiryDraftRow[]> {
    return this.prisma.db.priceInquiryDraft.findMany({
      where: { opportunityId, leadId },
      include: INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async findDraft(
    opportunityId: string,
    leadId: string,
    draftId: string,
  ): Promise<PriceInquiryDraftRow | null> {
    return this.prisma.db.priceInquiryDraft.findFirst({
      where: { id: draftId, opportunityId, leadId },
      include: INCLUDE,
    });
  }

  /** Loads one draft by id (used by the owner's status transitions). */
  async findDraftById(draftId: string): Promise<PriceInquiryDraftRow | null> {
    return this.prisma.db.priceInquiryDraft.findUnique({
      where: { id: draftId },
      include: INCLUDE,
    });
  }

  /**
   * Writes the draft status. Only the `price-inquiry` service calls this; the
   * quote-collection module goes through that service.
   */
  async updateStatus(
    draftId: string,
    status: PriceInquiryStatus,
  ): Promise<PriceInquiryDraftRow> {
    return this.prisma.db.priceInquiryDraft.update({
      where: { id: draftId },
      data: { status },
      include: INCLUDE,
    });
  }

  async updateDraft(
    draftId: string,
    data: UpdatePriceInquiryDraftData,
  ): Promise<PriceInquiryDraftRow> {
    const update: Prisma.PriceInquiryDraftUpdateInput = {};
    if (data.subject !== undefined) update.subject = data.subject;
    if (data.body !== undefined) update.body = data.body;
    if (data.recipientEmail !== undefined) {
      update.recipientEmail = data.recipientEmail;
    }
    if (data.contactId !== undefined) {
      update.contact =
        data.contactId === null
          ? { disconnect: true }
          : { connect: { id: data.contactId } };
    }
    if (data.senderProfileId !== undefined) {
      update.senderProfile = { connect: { id: data.senderProfileId } };
    }
    if (data.emailAccountId !== undefined) {
      update.emailAccount =
        data.emailAccountId === null
          ? { disconnect: true }
          : { connect: { id: data.emailAccountId } };
    }
    if (data.senderSnapshot !== undefined) {
      update.senderSnapshot =
        data.senderSnapshot === null
          ? Prisma.DbNull
          : (data.senderSnapshot as unknown as Prisma.InputJsonValue);
    }
    return this.prisma.db.priceInquiryDraft.update({
      where: { id: draftId },
      data: update,
      include: INCLUDE,
    });
  }

  /** Read-only count for a future dashboard aggregation. */
  async countDrafts(): Promise<number> {
    return this.prisma.db.priceInquiryDraft.count();
  }
}
