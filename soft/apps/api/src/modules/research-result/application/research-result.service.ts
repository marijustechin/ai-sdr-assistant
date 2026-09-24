import { Inject, Injectable } from '@nestjs/common';
import type {
  ResearchClarificationState,
  ResearchResult,
  ResearchResultCounts,
  ResearchResultInquiry,
} from '@ai-sdr/contracts';
import { EvidenceService } from '../../evidence/application/evidence.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import { MarketResearcherService } from '../../market-researcher/application/research-runs.service.js';
import { PriceInquiryService } from '../../price-inquiry/application/price-inquiry.service.js';
import { ProductsAndOffersService } from '../../products-and-offers/application/products-and-offers.service.js';
import { QuoteCollectionService } from '../../quote-collection/application/quote-collection.service.js';

const CLARIFICATION_STATE: Record<string, ResearchClarificationState> = {
  SENT: 'AWAITING_REPLY',
  REPLY_RECEIVED: 'REPLY_RECEIVED',
  QUOTE_EXTRACTED: 'QUOTE_RECEIVED',
  NO_RESPONSE: 'NO_RESPONSE',
};

/** Draft statuses that represent a sent inquiry (i.e. a clarification). */
const SENT_STATUSES = new Set([
  'SENT',
  'REPLY_RECEIVED',
  'QUOTE_EXTRACTED',
  'NO_RESPONSE',
]);

/**
 * Read model for a publishable market-research result. Composes the frozen
 * snapshot (owner `market-researcher`) with live enrichment from the owning
 * modules so later supplier replies enrich the result without rewriting
 * historical evidence. Owns no tables itself.
 */
@Injectable()
export class ResearchResultService {
  constructor(
    @Inject(MarketResearcherService)
    private readonly runs: MarketResearcherService,
    @Inject(PriceInquiryService)
    private readonly priceInquiry: PriceInquiryService,
    @Inject(EvidenceService)
    private readonly evidence: EvidenceService,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(ProductsAndOffersService)
    private readonly products: ProductsAndOffersService,
    @Inject(QuoteCollectionService)
    private readonly quoteCollection: QuoteCollectionService,
  ) {}

  async getResult(
    opportunityId: string,
    runId: string,
  ): Promise<ResearchResult> {
    const { run, envelope, counts, inquiries } = await this.compose(
      opportunityId,
      runId,
    );
    return {
      runId,
      opportunityId,
      status: run.status,
      researchCompletedAt:
        envelope?.researchCompletedAt.toISOString() ?? null,
      lastEnrichedAt: envelope?.lastEnrichedAt.toISOString() ?? null,
      frozenSnapshot: envelope?.frozenSnapshot ?? null,
      counts,
      inquiries,
    };
  }

  /**
   * Freezes and publishes the result: the run becomes `COMPLETED` or
   * `COMPLETED_WITH_PENDING_CLARIFICATIONS`. Idempotent — the original snapshot
   * is preserved on re-finalize.
   */
  async finalize(
    opportunityId: string,
    runId: string,
  ): Promise<ResearchResult> {
    const { counts } = await this.compose(opportunityId, runId);
    await this.runs.finalizeResult(opportunityId, runId, {
      snapshot: { counts, frozenAt: new Date().toISOString() },
      pendingClarifications: counts.pendingClarifications,
    });
    return this.getResult(opportunityId, runId);
  }

  private async compose(
    opportunityId: string,
    runId: string,
  ): Promise<{
    run: Awaited<ReturnType<MarketResearcherService['getRunById']>>;
    envelope: Awaited<
      ReturnType<MarketResearcherService['getResultEnvelope']>
    >;
    counts: ResearchResultCounts;
    inquiries: ResearchResultInquiry[];
  }> {
    const [run, envelope, drafts, evidence, offerings, leads] =
      await Promise.all([
        this.runs.getRunById(runId),
        this.runs.getResultEnvelope(opportunityId, runId),
        this.priceInquiry.listDraftsForOpportunity(opportunityId),
        this.evidence.listEvidence(opportunityId, runId),
        this.evidence.listOfferings(opportunityId, runId),
        this.leads.listLeads(opportunityId),
      ]);

    const sentDrafts = drafts.filter((draft) =>
      SENT_STATUSES.has(draft.status),
    );
    const views = await this.quoteCollection.getInquiryViews(
      sentDrafts.map((draft) => draft.id),
    );
    const viewByDraft = new Map(views.map((view) => [view.draftId, view]));

    const companyNames = new Map<string, string>();
    const productNames = new Map<string, string>();
    const inquiries: ResearchResultInquiry[] = [];
    for (const draft of sentDrafts) {
      let companyName = companyNames.get(draft.companyId);
      if (companyName === undefined) {
        const company = await this.leads.getCompany(draft.companyId);
        companyName = company?.name ?? 'Unknown company';
        companyNames.set(draft.companyId, companyName);
      }
      let productName = productNames.get(draft.productId);
      if (productName === undefined) {
        const product = await this.products.getProduct(draft.productId);
        productName = product?.name ?? 'Unknown product';
        productNames.set(draft.productId, productName);
      }
      const view = viewByDraft.get(draft.id);
      inquiries.push({
        draftId: draft.id,
        companyId: draft.companyId,
        companyName,
        productName,
        recipientEmail: draft.recipientEmail,
        inquiryStatus: draft.status,
        clarificationState:
          CLARIFICATION_STATE[draft.status] ?? 'AWAITING_REPLY',
        quoteId: view?.quoteId ?? null,
        quotePriceText: view?.quotePriceText ?? null,
        quoteCurrency: view?.quoteCurrency ?? null,
        followUpStatus: view?.followUpStatus ?? null,
        attemptCount: view?.attemptCount ?? 0,
        nextCheckAt: view?.nextCheckAt?.toISOString() ?? null,
        lastCheckedAt: view?.lastCheckedAt?.toISOString() ?? null,
      });
    }

    const counts: ResearchResultCounts = {
      evidenceCount: evidence.length,
      sourceCount: new Set(
        evidence.map((record) => record.sourceReferenceId),
      ).size,
      currentSellers: new Set(
        offerings
          .map((offering) => offering.companyText)
          .filter((value): value is string => Boolean(value)),
      ).size,
      potentialBuyers: leads.length,
      publicPriceObservations: offerings.filter(
        (offering) => offering.priceText !== null,
      ).length,
      pendingClarifications: drafts.filter((draft) => draft.status === 'SENT')
        .length,
      repliesReceived: drafts.filter(
        (draft) => draft.status === 'REPLY_RECEIVED',
      ).length,
      quotesReceived: drafts.filter(
        (draft) => draft.status === 'QUOTE_EXTRACTED',
      ).length,
      noResponseInquiries: drafts.filter(
        (draft) => draft.status === 'NO_RESPONSE',
      ).length,
    };

    return { run, envelope, counts, inquiries };
  }
}
