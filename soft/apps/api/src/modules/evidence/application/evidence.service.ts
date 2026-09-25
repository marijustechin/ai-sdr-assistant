import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CorrectClaimInput,
  CreateOfferingInput,
  PersistClaimInput,
  PersistEvidenceInput,
  RegisterSourceInput,
} from '@ai-sdr/contracts';
import { MarketResearcherService } from '../../market-researcher/application/research-runs.service.js';
import { ClaimCorrectionError, OfferingError } from '../domain/types.js';
import type {
  ClaimRecord,
  EvidenceRecord,
  OfferingRecord,
  SourceReferenceRecord,
} from '../domain/types.js';
import { EvidenceRepository } from '../infrastructure/evidence.repository.js';

/**
 * Application service for the `evidence` module: the single owner of source
 * references, raw evidence, and claims. Sources are deduplicated by URL;
 * evidence stays separate from the claims derived from it.
 */
@Injectable()
export class EvidenceService {
  constructor(
    @Inject(EvidenceRepository)
    private readonly repository: EvidenceRepository,
    @Inject(MarketResearcherService)
    private readonly runs: MarketResearcherService,
  ) {}

  async registerSource(
    opportunityId: string,
    runId: string,
    input: RegisterSourceInput,
  ): Promise<SourceReferenceRecord> {
    await this.runs.assertRun(opportunityId, runId);
    return this.repository.findOrCreateSource(input);
  }

  /**
   * Get-or-create a source reference **without** run scope, for the bounded
   * contact-discovery slice: contact provenance is independent of the completed
   * research run, so it never reopens a run. `source_references` stays owned by
   * `evidence`; callers go through this service.
   */
  async getOrCreateSource(
    input: RegisterSourceInput,
  ): Promise<SourceReferenceRecord> {
    return this.repository.findOrCreateSource(input);
  }

  async listSources(
    opportunityId: string,
    runId: string,
  ): Promise<SourceReferenceRecord[]> {
    await this.runs.assertRun(opportunityId, runId);
    return this.repository.listSourcesForRun(runId);
  }

  async persistEvidence(
    opportunityId: string,
    runId: string,
    input: PersistEvidenceInput,
  ): Promise<EvidenceRecord> {
    await this.runs.assertRun(opportunityId, runId);
    const source = await this.repository.findOrCreateSource({
      url: input.url,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.publisher !== undefined ? { publisher: input.publisher } : {}),
      ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
    });
    return this.repository.createEvidence({
      researchRunId: runId,
      sourceReferenceId: source.id,
      evidenceText: input.evidenceText,
      ...(input.verificationStatus !== undefined
        ? { verificationStatus: input.verificationStatus }
        : {}),
      ...(input.retrievedAt !== undefined
        ? { retrievedAt: input.retrievedAt }
        : {}),
    });
  }

  async listEvidence(
    opportunityId: string,
    runId: string,
  ): Promise<EvidenceRecord[]> {
    await this.runs.assertRun(opportunityId, runId);
    return this.repository.listEvidenceForRun(runId);
  }

  async persistClaim(
    opportunityId: string,
    runId: string,
    input: PersistClaimInput,
  ): Promise<ClaimRecord> {
    await this.runs.assertRun(opportunityId, runId);

    const seen = new Set<string>();
    const links = (input.evidence ?? []).filter((link) => {
      if (seen.has(link.evidenceId)) {
        return false;
      }
      seen.add(link.evidenceId);
      return true;
    });

    if (links.length > 0) {
      const found = await this.repository.findEvidenceInRun(
        links.map((link) => link.evidenceId),
        runId,
      );
      if (found.length !== links.length) {
        throw new BadRequestException({ error: 'evidence_not_found_in_run' });
      }
    }

    return this.repository.createClaim({
      researchRunId: runId,
      type: input.type,
      statement: input.statement,
      ...(input.confidence !== undefined
        ? { confidence: input.confidence }
        : {}),
      evidence: links.map((link) => ({
        evidenceId: link.evidenceId,
        ...(link.stance !== undefined ? { stance: link.stance } : {}),
      })),
    });
  }

  async listClaims(
    opportunityId: string,
    runId: string,
    includeHistory = false,
  ): Promise<ClaimRecord[]> {
    await this.runs.assertRun(opportunityId, runId);
    return this.repository.listClaimsForRun(runId, includeHistory);
  }

  /**
   * Retracts or replaces a claim. The original claim and its evidence links are
   * preserved; only the correction lifecycle fields change. Rejections are
   * mapped to non-sensitive, typed HTTP errors.
   */
  async correctClaim(
    opportunityId: string,
    runId: string,
    claimId: string,
    input: CorrectClaimInput,
  ): Promise<ClaimRecord> {
    await this.runs.assertRun(opportunityId, runId);
    try {
      return await this.repository.correctClaim(runId, claimId, {
        kind: input.kind,
        reason: input.reason,
        ...(input.replacementClaimId !== undefined
          ? { replacementClaimId: input.replacementClaimId }
          : {}),
      });
    } catch (error) {
      if (error instanceof ClaimCorrectionError) {
        if (error.code === 'claim_not_found') {
          throw new NotFoundException({ error: error.code });
        }
        if (error.code === 'claim_already_corrected') {
          throw new ConflictException({ error: error.code });
        }
        throw new BadRequestException({ error: error.code });
      }
      throw error;
    }
  }

  /** Creates or updates an offering; idempotent by fingerprint. */
  async createOffering(
    opportunityId: string,
    runId: string,
    input: CreateOfferingInput,
  ): Promise<OfferingRecord> {
    await this.runs.assertRun(opportunityId, runId);
    try {
      return await this.repository.createOffering({
        researchRunId: runId,
        ...(input.companyText !== undefined
          ? { companyText: input.companyText }
          : {}),
        ...(input.companyLocationText !== undefined
          ? { companyLocationText: input.companyLocationText }
          : {}),
        ...(input.marketServedText !== undefined
          ? { marketServedText: input.marketServedText }
          : {}),
        ...(input.productText !== undefined
          ? { productText: input.productText }
          : {}),
        ...(input.applicationText !== undefined
          ? { applicationText: input.applicationText }
          : {}),
        ...(input.treatmentText !== undefined
          ? { treatmentText: input.treatmentText }
          : {}),
        ...(input.dimensionsText !== undefined
          ? { dimensionsText: input.dimensionsText }
          : {}),
        ...(input.priceText !== undefined ? { priceText: input.priceText } : {}),
        ...(input.priceAmountNumeric !== undefined
          ? { priceAmountNumeric: input.priceAmountNumeric }
          : {}),
        ...(input.priceCurrency !== undefined
          ? { priceCurrency: input.priceCurrency }
          : {}),
        ...(input.priceUnit !== undefined ? { priceUnit: input.priceUnit } : {}),
        ...(input.vatStatus !== undefined ? { vatStatus: input.vatStatus } : {}),
        ...(input.priceBasis !== undefined
          ? { priceBasis: input.priceBasis }
          : {}),
        ...(input.sampleKind !== undefined
          ? { sampleKind: input.sampleKind }
          : {}),
        ...(input.matchType !== undefined ? { matchType: input.matchType } : {}),
        sourceReferenceId: input.sourceReferenceId,
        evidenceId: input.evidenceId,
        ...(input.claimId !== undefined ? { claimId: input.claimId } : {}),
      });
    } catch (error) {
      if (error instanceof OfferingError) {
        throw new BadRequestException({ error: error.code });
      }
      throw error;
    }
  }

  async listOfferings(
    opportunityId: string,
    runId: string,
  ): Promise<OfferingRecord[]> {
    await this.runs.assertRun(opportunityId, runId);
    return this.repository.listOfferingsForRun(runId);
  }

  /**
   * Reads one offering, asserting it belongs to the opportunity's runs (so a
   * company-scoped decision cannot be entered against another opportunity's
   * offering).
   */
  async getOffering(
    opportunityId: string,
    offeringId: string,
  ): Promise<OfferingRecord> {
    const offering = await this.repository.findOffering(offeringId);
    if (!offering) {
      throw new NotFoundException({ error: 'offering_not_found' });
    }
    await this.runs.assertRun(opportunityId, offering.researchRunId);
    return offering;
  }
}
