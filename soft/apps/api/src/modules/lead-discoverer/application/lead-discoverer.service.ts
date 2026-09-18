import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateLeadInput, UpdateLeadReviewInput } from '@ai-sdr/contracts';
import { EvidenceService } from '../../evidence/application/evidence.service.js';
import { OpportunitiesService } from '../../opportunities/application/opportunities.service.js';
import type { CreateLeadData, LeadRecord } from '../domain/types.js';
import { LeadRepository } from '../infrastructure/lead.repository.js';

/**
 * Application service for the `lead-discoverer` module: the evidence-backed
 * potential-buyer shortlist. It owns `companies` and `opportunity_companies`,
 * validates provenance through the `evidence` module, and never invents demand,
 * volumes, contacts, or scores.
 */
@Injectable()
export class LeadDiscovererService {
  constructor(
    @Inject(LeadRepository)
    private readonly repository: LeadRepository,
    @Inject(OpportunitiesService)
    private readonly opportunities: OpportunitiesService,
    @Inject(EvidenceService)
    private readonly evidence: EvidenceService,
  ) {}

  /**
   * Registers or refreshes a candidate. Provenance is mandatory and validated:
   * the run must belong to the opportunity, the evidence must belong to the run,
   * and a linked claim must be a CURRENT claim of the same run (a superseded
   * claim cannot support a new candidate).
   */
  async createLead(
    opportunityId: string,
    input: CreateLeadInput,
  ): Promise<LeadRecord> {
    await this.opportunities.getContextData(opportunityId);

    const runEvidence = await this.evidence.listEvidence(
      opportunityId,
      input.researchRunId,
    );
    const evidence = runEvidence.find((item) => item.id === input.evidenceId);
    if (!evidence) {
      throw new BadRequestException({ error: 'lead_evidence_not_found' });
    }

    if (input.claimId !== undefined) {
      const runClaims = await this.evidence.listClaims(
        opportunityId,
        input.researchRunId,
        true,
      );
      const claim = runClaims.find((item) => item.id === input.claimId);
      if (!claim) {
        throw new BadRequestException({ error: 'lead_claim_not_found' });
      }
      if (claim.lifecycleStatus !== 'CURRENT') {
        throw new BadRequestException({ error: 'lead_claim_not_current' });
      }
    }

    const data: CreateLeadData = {
      opportunityId,
      companyName: input.companyName,
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      observedActivityText: input.observedActivityText,
      observedRoles: input.observedRoles,
      buyerFitHypothesisText: input.buyerFitHypothesisText,
      ...(input.unknownsText !== undefined
        ? { unknownsText: input.unknownsText }
        : {}),
      ...(input.nextVerificationStepText !== undefined
        ? { nextVerificationStepText: input.nextVerificationStepText }
        : {}),
      sourceReferenceId: evidence.sourceReferenceId,
      evidenceId: evidence.id,
      ...(input.claimId !== undefined ? { claimId: input.claimId } : {}),
    };
    return this.repository.createLead(data);
  }

  async listLeads(opportunityId: string): Promise<LeadRecord[]> {
    await this.opportunities.getContextData(opportunityId);
    return this.repository.listLeads(opportunityId);
  }

  async getLead(opportunityId: string, leadId: string): Promise<LeadRecord> {
    const lead = await this.repository.findLead(opportunityId, leadId);
    if (!lead) {
      throw new NotFoundException({ error: 'lead_not_found' });
    }
    return lead;
  }

  /**
   * Records an operator review action. A lead whose supporting claim is no
   * longer CURRENT cannot be marked shortlisted — it must be re-reviewed first.
   */
  async reviewLead(
    opportunityId: string,
    leadId: string,
    input: UpdateLeadReviewInput,
  ): Promise<LeadRecord> {
    const lead = await this.repository.findLead(opportunityId, leadId);
    if (!lead) {
      throw new NotFoundException({ error: 'lead_not_found' });
    }
    if (input.reviewStatus === 'SHORTLISTED' && lead.needsReview) {
      throw new ConflictException({ error: 'lead_claim_not_current' });
    }
    return this.repository.updateReview(leadId, {
      reviewStatus: input.reviewStatus,
      ...(input.reviewReason !== undefined
        ? { reviewReason: input.reviewReason }
        : {}),
    });
  }
}
