import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type { CreateDraftData } from '../domain/types.js';

const DRAFT_INCLUDE = {
  contact: true,
} satisfies Prisma.OutreachDraftInclude;

export type OutreachDraftRow = Prisma.OutreachDraftGetPayload<{
  include: typeof DRAFT_INCLUDE;
}>;

/**
 * Typed repository scoped to the table owned by `outreach-drafter`:
 * `outreach_drafts`. Drafts are append-only; the unique `fingerprint` makes a
 * re-run with identical inputs idempotent, and a material change inserts a new
 * `version` rather than overwriting the previous draft.
 */
@Injectable()
export class OutreachDraftRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findByFingerprint(
    fingerprint: string,
  ): Promise<OutreachDraftRow | null> {
    return this.prisma.db.outreachDraft.findUnique({
      where: { fingerprint },
      include: DRAFT_INCLUDE,
    });
  }

  async createDraft(data: CreateDraftData): Promise<OutreachDraftRow> {
    return this.prisma.db.outreachDraft.create({
      data: {
        opportunityId: data.opportunityId,
        leadId: data.leadId,
        companyId: data.companyId,
        contactId: data.contactId ?? null,
        recipientEmail: data.recipientEmail ?? null,
        language: data.language,
        preparationStatus: data.preparationStatus,
        subject: data.subject ?? null,
        body: data.body ?? null,
        rationale: data.rationale,
        recipientRationale: data.recipientRationale,
        missingFields: data.missingFields,
        contextVersion: data.contextVersion ?? null,
        evidenceId: data.evidenceId ?? null,
        claimId: data.claimId ?? null,
        sourceReferenceId: data.sourceReferenceId ?? null,
        senderProfileId: data.senderProfileId ?? null,
        emailAccountId: data.emailAccountId ?? null,
        senderSnapshot:
          data.senderSnapshot === undefined
            ? Prisma.DbNull
            : (data.senderSnapshot as unknown as Prisma.InputJsonValue),
        version: data.version,
        fingerprint: data.fingerprint,
      },
      include: DRAFT_INCLUDE,
    });
  }

  async listDrafts(
    opportunityId: string,
    leadId: string,
  ): Promise<OutreachDraftRow[]> {
    return this.prisma.db.outreachDraft.findMany({
      where: { opportunityId, leadId },
      include: DRAFT_INCLUDE,
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findDraft(
    opportunityId: string,
    leadId: string,
    draftId: string,
  ): Promise<OutreachDraftRow | null> {
    return this.prisma.db.outreachDraft.findFirst({
      where: { id: draftId, opportunityId, leadId },
      include: DRAFT_INCLUDE,
    });
  }

  async nextVersion(opportunityId: string, leadId: string): Promise<number> {
    const result = await this.prisma.db.outreachDraft.aggregate({
      where: { opportunityId, leadId },
      _max: { version: true },
    });
    return (result._max.version ?? 0) + 1;
  }

  /**
   * Draft counts per preparation status (read-only dashboard aggregation).
   * Counts persisted draft records (versions), matching the append-only model.
   */
  async countDraftsByPreparationStatus(): Promise<
    Record<'PREPARED' | 'BLOCKED', number>
  > {
    const grouped = await this.prisma.db.outreachDraft.groupBy({
      by: ['preparationStatus'],
      _count: { _all: true },
    });
    const counts: Record<'PREPARED' | 'BLOCKED', number> = {
      PREPARED: 0,
      BLOCKED: 0,
    };
    for (const row of grouped) {
      counts[row.preparationStatus] = row._count._all;
    }
    return counts;
  }
}
