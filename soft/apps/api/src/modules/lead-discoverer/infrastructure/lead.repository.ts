import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import {
  companyIdentityKey,
  leadDedupKey,
  normalizeCompanyName,
} from '../domain/identity.js';
import type {
  CompanyRecord,
  CreateLeadData,
  LeadClaimRecord,
  LeadEvidenceRecord,
  LeadRecord,
  LeadSourceRecord,
  UpdateLeadReviewData,
  UpdateQualificationData,
} from '../domain/types.js';

const LEAD_INCLUDE = {
  company: true,
  evidence: { include: { sourceReference: true } },
  claim: true,
} satisfies Prisma.OpportunityCompanyInclude;

type LeadWithRelations = Prisma.OpportunityCompanyGetPayload<{
  include: typeof LEAD_INCLUDE;
}>;

function toCompanyRecord(company: LeadWithRelations['company']): CompanyRecord {
  return {
    id: company.id,
    name: company.name,
    normalizedName: company.normalizedName,
    website: company.website,
    country: company.country,
  };
}

function toSourceRecord(
  source: LeadWithRelations['evidence']['sourceReference'],
): LeadSourceRecord {
  return {
    id: source.id,
    url: source.url,
    title: source.title,
    publisher: source.publisher,
    sourceType: source.sourceType,
  };
}

function toEvidenceRecord(
  evidence: LeadWithRelations['evidence'],
): LeadEvidenceRecord {
  return {
    id: evidence.id,
    researchRunId: evidence.researchRunId,
    evidenceText: evidence.evidenceText,
    verificationStatus: evidence.verificationStatus,
    retrievedAt: evidence.retrievedAt,
    source: toSourceRecord(evidence.sourceReference),
  };
}

function toClaimRecord(
  claim: NonNullable<LeadWithRelations['claim']>,
): LeadClaimRecord {
  return {
    id: claim.id,
    type: claim.type,
    statement: claim.statement,
    confidence: claim.confidence,
    lifecycleStatus: claim.lifecycleStatus,
    correctionReason: claim.correctionReason,
    correctedAt: claim.correctedAt,
    replacedByClaimId: claim.replacedByClaimId,
  };
}

function toLeadRecord(row: LeadWithRelations): LeadRecord {
  const claim = row.claim ? toClaimRecord(row.claim) : null;
  const needsReview = claim !== null && claim.lifecycleStatus !== 'CURRENT';
  const agentQualificationStale =
    needsReview && row.agentQualificationStatus !== 'NOT_ASSESSED';
  return {
    id: row.id,
    opportunityId: row.opportunityId,
    companyId: row.companyId,
    company: toCompanyRecord(row.company),
    observedActivityText: row.observedActivityText,
    observedRoles: row.observedRoles as LeadRecord['observedRoles'],
    buyerFitHypothesisText: row.buyerFitHypothesisText,
    unknownsText: row.unknownsText,
    nextVerificationStepText: row.nextVerificationStepText,
    reviewStatus: row.reviewStatus,
    reviewReason: row.reviewReason,
    reviewedAt: row.reviewedAt,
    agentQualificationStatus: row.agentQualificationStatus,
    agentQualificationReason: row.agentQualificationReason,
    agentAssessedAt: row.agentAssessedAt,
    agentQualificationStale,
    eligibleForContactDiscovery:
      !needsReview &&
      row.reviewStatus !== 'REJECTED' &&
      (row.agentQualificationStatus === 'QUALIFIED' ||
        row.reviewStatus === 'SHORTLISTED'),
    sourceReferenceId: row.sourceReferenceId,
    evidenceId: row.evidenceId,
    claimId: row.claimId,
    dedupKey: row.dedupKey,
    needsReview,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    evidence: toEvidenceRecord(row.evidence),
    claim,
  };
}

/**
 * Typed repository scoped to the tables owned by `lead-discoverer`:
 * `companies` and `opportunity_companies`. Reads evidence/claims/source
 * references only for the declared read model (display of provenance).
 */
@Injectable()
export class LeadRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates or refreshes a candidate. The company is deduplicated by a
   * deterministic identity key and the lead by `(opportunity, company)` so a
   * repeated submission never creates a duplicate. A resubmission refreshes the
   * observed/hypothesis fields but never changes the operator review state.
   */
  async createLead(data: CreateLeadData): Promise<LeadRecord> {
    const normalizedName = normalizeCompanyName(data.companyName);
    const identityKey = companyIdentityKey(data.companyName, data.country ?? null);
    const dedupKey = leadDedupKey(data.opportunityId, identityKey);

    const lead = await this.prisma.db.$transaction(async (tx) => {
      const company = await tx.company.upsert({
        where: { identityKey },
        create: {
          name: data.companyName,
          normalizedName,
          website: data.website ?? null,
          country: data.country ?? null,
          identityKey,
        },
        update: {
          // The display name is first-seen and stable: a case/whitespace variant
          // of the same deterministic identity must not overwrite it.
          ...(data.website !== undefined ? { website: data.website } : {}),
          ...(data.country !== undefined ? { country: data.country } : {}),
        },
      });

      const fields = {
        companyId: company.id,
        observedActivityText: data.observedActivityText,
        observedRoles: data.observedRoles,
        buyerFitHypothesisText: data.buyerFitHypothesisText,
        unknownsText: data.unknownsText ?? null,
        nextVerificationStepText: data.nextVerificationStepText ?? null,
        sourceReferenceId: data.sourceReferenceId,
        evidenceId: data.evidenceId,
        claimId: data.claimId ?? null,
      };

      return tx.opportunityCompany.upsert({
        where: { dedupKey },
        create: {
          opportunityId: data.opportunityId,
          dedupKey,
          ...fields,
        },
        update: fields,
        include: LEAD_INCLUDE,
      });
    });

    return toLeadRecord(lead);
  }

  /** Read model for `contact-discovery`: a company by id (owned by this module). */
  async findCompany(companyId: string): Promise<CompanyRecord | null> {
    const company = await this.prisma.db.company.findUnique({
      where: { id: companyId },
    });
    return company ? toCompanyRecord(company) : null;
  }

  async listLeads(opportunityId: string): Promise<LeadRecord[]> {
    const rows = await this.prisma.db.opportunityCompany.findMany({
      where: { opportunityId },
      include: LEAD_INCLUDE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toLeadRecord);
  }

  async findLead(
    opportunityId: string,
    leadId: string,
  ): Promise<LeadRecord | null> {
    const row = await this.prisma.db.opportunityCompany.findFirst({
      where: { id: leadId, opportunityId },
      include: LEAD_INCLUDE,
    });
    return row ? toLeadRecord(row) : null;
  }

  /**
   * Applies an operator review action. Returning a lead to `UNREVIEWED` clears
   * the reason and timestamp; other states record when the decision was made.
   */
  async updateReview(
    leadId: string,
    data: UpdateLeadReviewData,
  ): Promise<LeadRecord> {
    const reviewed = data.reviewStatus !== 'UNREVIEWED';
    const row = await this.prisma.db.opportunityCompany.update({
      where: { id: leadId },
      data: {
        reviewStatus: data.reviewStatus,
        reviewReason: reviewed ? (data.reviewReason ?? null) : null,
        reviewedAt: reviewed ? new Date() : null,
      },
      include: LEAD_INCLUDE,
    });
    return toLeadRecord(row);
  }

  /**
   * Records the agent's qualification decision. Writes only the agent fields —
   * the operator review fields are never touched here, so automatic
   * qualification cannot masquerade as a human decision.
   */
  async qualifyLead(
    leadId: string,
    data: UpdateQualificationData,
  ): Promise<LeadRecord> {
    const assessed = data.status !== 'NOT_ASSESSED';
    const row = await this.prisma.db.opportunityCompany.update({
      where: { id: leadId },
      data: {
        agentQualificationStatus: data.status,
        agentQualificationReason: assessed ? (data.reason ?? null) : null,
        agentAssessedAt: assessed ? new Date() : null,
      },
      include: LEAD_INCLUDE,
    });
    return toLeadRecord(row);
  }
}
