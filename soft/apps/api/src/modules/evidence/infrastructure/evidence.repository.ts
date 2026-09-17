import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  PrismaService,
  type Claim,
  type ClaimEvidence,
  type Evidence,
  type ResearchOffering,
  type SourceReference,
} from '@ai-sdr/database';
import { ClaimCorrectionError, OfferingError } from '../domain/types.js';
import type {
  ClaimEvidenceStance,
  ClaimLifecycleStatus,
  ClaimRecord,
  CorrectClaimData,
  CreateOfferingData,
  EvidenceRecord,
  OfferingRecord,
  PersistClaimData,
  PersistEvidenceData,
  RegisterSourceData,
  SourceReferenceRecord,
} from '../domain/types.js';

type EvidenceWithSource = Evidence & { sourceReference: SourceReference };
type ClaimWithLinks = Claim & { evidenceLinks: ClaimEvidence[] };

function toSourceRecord(source: SourceReference): SourceReferenceRecord {
  return {
    id: source.id,
    url: source.url,
    title: source.title,
    publisher: source.publisher,
    sourceType: source.sourceType,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function toEvidenceRecord(evidence: EvidenceWithSource): EvidenceRecord {
  return {
    id: evidence.id,
    sourceReferenceId: evidence.sourceReferenceId,
    researchRunId: evidence.researchRunId,
    evidenceText: evidence.evidenceText,
    verificationStatus: evidence.verificationStatus,
    retrievedAt: evidence.retrievedAt,
    createdAt: evidence.createdAt,
    updatedAt: evidence.updatedAt,
    source: toSourceRecord(evidence.sourceReference),
  };
}

function toClaimRecord(claim: ClaimWithLinks): ClaimRecord {
  return {
    id: claim.id,
    researchRunId: claim.researchRunId,
    type: claim.type,
    statement: claim.statement,
    confidence: claim.confidence,
    lifecycleStatus: claim.lifecycleStatus as ClaimLifecycleStatus,
    correctionReason: claim.correctionReason,
    correctedAt: claim.correctedAt,
    replacedByClaimId: claim.replacedByClaimId,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    evidence: claim.evidenceLinks.map((link) => ({
      id: link.id,
      evidenceId: link.evidenceId,
      stance: link.stance as ClaimEvidenceStance,
    })),
  };
}

type OfferingWithEvidence = ResearchOffering & { evidence: EvidenceWithSource };

function toOfferingRecord(offering: OfferingWithEvidence): OfferingRecord {
  return {
    id: offering.id,
    researchRunId: offering.researchRunId,
    companyText: offering.companyText,
    companyLocationText: offering.companyLocationText,
    marketServedText: offering.marketServedText,
    productText: offering.productText,
    applicationText: offering.applicationText,
    treatmentText: offering.treatmentText,
    dimensionsText: offering.dimensionsText,
    priceText: offering.priceText,
    priceCurrency: offering.priceCurrency,
    priceUnit: offering.priceUnit,
    vatStatus: offering.vatStatus,
    priceBasis: offering.priceBasis,
    sampleKind: offering.sampleKind,
    matchType: offering.matchType,
    sourceReferenceId: offering.sourceReferenceId,
    evidenceId: offering.evidenceId,
    claimId: offering.claimId,
    fingerprint: offering.fingerprint,
    createdAt: offering.createdAt,
    updatedAt: offering.updatedAt,
    evidence: toEvidenceRecord(offering.evidence),
  };
}

/** Deterministic per-run idempotency key: identical submissions never duplicate. */
function offeringFingerprint(data: CreateOfferingData): string {
  const parts = [
    data.researchRunId,
    data.companyText,
    data.companyLocationText,
    data.marketServedText,
    data.productText,
    data.applicationText,
    data.treatmentText,
    data.dimensionsText,
    data.priceText,
    data.sourceReferenceId,
  ]
    .map((part) => (part ?? '').trim().toLowerCase())
    .join('\u0000');
  return createHash('sha256').update(parts, 'utf8').digest('hex');
}

/**
 * Typed repository scoped to the tables owned by `evidence`:
 * `source_references`, `evidence`, `claims`, `claim_evidence`.
 */
@Injectable()
export class EvidenceRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Finds an existing source by URL or creates it (never duplicates a URL). */
  async findOrCreateSource(
    data: RegisterSourceData,
  ): Promise<SourceReferenceRecord> {
    const source = await this.prisma.db.sourceReference.upsert({
      where: { url: data.url },
      create: {
        url: data.url,
        title: data.title ?? null,
        publisher: data.publisher ?? null,
        sourceType: data.sourceType ?? null,
      },
      update: {},
    });
    return toSourceRecord(source);
  }

  async createEvidence(data: PersistEvidenceData): Promise<EvidenceRecord> {
    const evidence = await this.prisma.db.evidence.create({
      data: {
        researchRunId: data.researchRunId,
        sourceReferenceId: data.sourceReferenceId,
        evidenceText: data.evidenceText,
        ...(data.verificationStatus !== undefined
          ? { verificationStatus: data.verificationStatus }
          : {}),
        ...(data.retrievedAt !== undefined
          ? { retrievedAt: data.retrievedAt }
          : {}),
      },
      include: { sourceReference: true },
    });
    return toEvidenceRecord(evidence);
  }

  async listEvidenceForRun(researchRunId: string): Promise<EvidenceRecord[]> {
    const evidence = await this.prisma.db.evidence.findMany({
      where: { researchRunId },
      orderBy: { createdAt: 'asc' },
      include: { sourceReference: true },
    });
    return evidence.map(toEvidenceRecord);
  }

  async findEvidenceInRun(
    evidenceIds: string[],
    researchRunId: string,
  ): Promise<EvidenceRecord[]> {
    if (evidenceIds.length === 0) {
      return [];
    }
    const evidence = await this.prisma.db.evidence.findMany({
      where: { id: { in: evidenceIds }, researchRunId },
      include: { sourceReference: true },
    });
    return evidence.map(toEvidenceRecord);
  }

  /** Sources referenced by any evidence of the run (deduplicated at write). */
  async listSourcesForRun(
    researchRunId: string,
  ): Promise<SourceReferenceRecord[]> {
    const sources = await this.prisma.db.sourceReference.findMany({
      where: { evidence: { some: { researchRunId } } },
      orderBy: { createdAt: 'asc' },
    });
    return sources.map(toSourceRecord);
  }

  async createClaim(data: PersistClaimData): Promise<ClaimRecord> {
    return this.prisma.db.$transaction(async (tx) => {
      const claim = await tx.claim.create({
        data: {
          researchRunId: data.researchRunId,
          type: data.type,
          statement: data.statement,
          ...(data.confidence !== undefined
            ? { confidence: data.confidence }
            : {}),
        },
      });

      if (data.evidence.length > 0) {
        await tx.claimEvidence.createMany({
          data: data.evidence.map((link) => ({
            claimId: claim.id,
            evidenceId: link.evidenceId,
            ...(link.stance !== undefined ? { stance: link.stance } : {}),
          })),
        });
      }

      const full = await tx.claim.findUniqueOrThrow({
        where: { id: claim.id },
        include: { evidenceLinks: true },
      });
      return toClaimRecord(full);
    });
  }

  async listClaimsForRun(
    researchRunId: string,
    includeHistory = false,
  ): Promise<ClaimRecord[]> {
    const claims = await this.prisma.db.claim.findMany({
      where: includeHistory
        ? { researchRunId }
        : { researchRunId, lifecycleStatus: 'CURRENT' },
      orderBy: { createdAt: 'asc' },
      include: { evidenceLinks: true },
    });
    return claims.map(toClaimRecord);
  }

  /**
   * Corrects a claim in one transaction: the original row is preserved and only
   * its correction lifecycle fields change. Validates the target and, for a
   * replacement, that the replacement is a different, currently-current claim of
   * the same run, and that no replacement chain cycles back.
   */
  async correctClaim(
    researchRunId: string,
    claimId: string,
    data: CorrectClaimData,
  ): Promise<ClaimRecord> {
    return this.prisma.db.$transaction(async (tx) => {
      const target = await tx.claim.findFirst({
        where: { id: claimId, researchRunId },
      });
      if (!target) {
        throw new ClaimCorrectionError('claim_not_found');
      }
      if (target.lifecycleStatus !== 'CURRENT') {
        throw new ClaimCorrectionError('claim_already_corrected');
      }

      const correction = {
        correctionReason: data.reason,
        correctedAt: new Date(),
      };

      if (data.kind === 'REPLACEMENT') {
        const replacementClaimId = data.replacementClaimId;
        if (replacementClaimId === undefined || replacementClaimId === claimId) {
          throw new ClaimCorrectionError('claim_replacement_self');
        }
        const replacement = await tx.claim.findFirst({
          where: { id: replacementClaimId, researchRunId },
        });
        if (!replacement) {
          throw new ClaimCorrectionError('replacement_claim_not_found');
        }
        if (replacement.lifecycleStatus !== 'CURRENT') {
          throw new ClaimCorrectionError('replacement_claim_not_current');
        }
        // Walk the replacement chain; it must never lead back to the target.
        const seen = new Set<string>();
        let cursor: string | null = replacementClaimId;
        while (cursor !== null) {
          if (cursor === claimId) {
            throw new ClaimCorrectionError('claim_replacement_cycle');
          }
          if (seen.has(cursor)) {
            break;
          }
          seen.add(cursor);
          const next: { replacedByClaimId: string | null } | null =
            await tx.claim.findUnique({
              where: { id: cursor },
              select: { replacedByClaimId: true },
            });
          cursor = next?.replacedByClaimId ?? null;
        }

        await tx.claim.update({
          where: { id: claimId },
          data: {
            lifecycleStatus: 'REPLACED',
            replacedByClaimId: replacementClaimId,
            ...correction,
          },
        });
      } else {
        await tx.claim.update({
          where: { id: claimId },
          data: {
            lifecycleStatus: 'RETRACTED',
            replacedByClaimId: null,
            ...correction,
          },
        });
      }

      const full = await tx.claim.findUniqueOrThrow({
        where: { id: claimId },
        include: { evidenceLinks: true },
      });
      return toClaimRecord(full);
    });
  }

  /**
   * Creates or updates an offering, deduplicated by a deterministic per-run
   * fingerprint. Provenance is enforced: the evidence must belong to the run,
   * its source must match, and any linked claim must be a CURRENT claim of the
   * same run. Nothing is inferred — unrecorded fields stay null / `UNKNOWN`.
   */
  async createOffering(data: CreateOfferingData): Promise<OfferingRecord> {
    return this.prisma.db.$transaction(async (tx) => {
      const evidence = await tx.evidence.findFirst({
        where: { id: data.evidenceId, researchRunId: data.researchRunId },
        include: { sourceReference: true },
      });
      if (!evidence) {
        throw new OfferingError('offering_evidence_not_in_run');
      }
      if (evidence.sourceReferenceId !== data.sourceReferenceId) {
        throw new OfferingError('offering_source_mismatch');
      }
      if (data.claimId !== undefined) {
        const claim = await tx.claim.findFirst({
          where: { id: data.claimId, researchRunId: data.researchRunId },
        });
        if (!claim) {
          throw new OfferingError('offering_claim_not_in_run');
        }
        if (claim.lifecycleStatus !== 'CURRENT') {
          throw new OfferingError('offering_claim_not_current');
        }
      }

      const fingerprint = offeringFingerprint(data);
      const fields = {
        companyText: data.companyText ?? null,
        companyLocationText: data.companyLocationText ?? null,
        marketServedText: data.marketServedText ?? null,
        productText: data.productText ?? null,
        applicationText: data.applicationText ?? null,
        treatmentText: data.treatmentText ?? null,
        dimensionsText: data.dimensionsText ?? null,
        priceText: data.priceText ?? null,
        priceCurrency: data.priceCurrency ?? null,
        priceUnit: data.priceUnit ?? null,
        ...(data.vatStatus !== undefined ? { vatStatus: data.vatStatus } : {}),
        ...(data.priceBasis !== undefined
          ? { priceBasis: data.priceBasis }
          : {}),
        ...(data.sampleKind !== undefined
          ? { sampleKind: data.sampleKind }
          : {}),
        ...(data.matchType !== undefined ? { matchType: data.matchType } : {}),
      };

      const offering = await tx.researchOffering.upsert({
        where: { fingerprint },
        create: {
          researchRunId: data.researchRunId,
          sourceReferenceId: data.sourceReferenceId,
          evidenceId: data.evidenceId,
          claimId: data.claimId ?? null,
          fingerprint,
          ...fields,
        },
        update: {
          sourceReferenceId: data.sourceReferenceId,
          evidenceId: data.evidenceId,
          claimId: data.claimId ?? null,
          ...fields,
        },
        include: { evidence: { include: { sourceReference: true } } },
      });
      return toOfferingRecord(offering);
    });
  }

  async listOfferingsForRun(researchRunId: string): Promise<OfferingRecord[]> {
    const offerings = await this.prisma.db.researchOffering.findMany({
      where: { researchRunId },
      orderBy: [{ companyText: 'asc' }, { productText: 'asc' }],
      include: { evidence: { include: { sourceReference: true } } },
    });
    return offerings.map(toOfferingRecord);
  }
}
