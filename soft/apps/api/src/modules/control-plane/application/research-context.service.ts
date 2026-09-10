import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SCHEMA_VERSION,
  type ResearchContext,
  type TargetMarketContext,
} from '@ai-sdr/contracts';
import { OpportunitiesService } from '../../opportunities/application/opportunities.service.js';
import { ProductsAndOffersService } from '../../products-and-offers/application/products-and-offers.service.js';
import { assembleFacts } from '../domain/fact-mapping.js';

/**
 * Cross-cutting assembler owned by `control-plane`. Composes the canonical
 * `research_context_v1` DTO from the owning modules' application services and
 * applies redaction at assembly time.
 *
 * This is a **current assembled context**, not yet an immutable research-run
 * snapshot (research runs / `research_contexts` are a later slice).
 */
@Injectable()
export class ResearchContextService {
  constructor(
    @Inject(OpportunitiesService)
    private readonly opportunities: OpportunitiesService,
    @Inject(ProductsAndOffersService)
    private readonly products: ProductsAndOffersService,
  ) {}

  async getResearchContext(opportunityId: string): Promise<ResearchContext> {
    const { opportunity, targetMarkets } =
      await this.opportunities.getContextData(opportunityId);

    const offer = await this.products.getOffer(opportunity.offerId);
    if (!offer) {
      throw new NotFoundException({ error: 'offer_not_found' });
    }
    const product = await this.products.getProduct(offer.productId);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }

    const [productFacts, offerFacts] = await Promise.all([
      this.products.getFactsForProduct(product.id),
      this.products.getFactsForOffer(offer.id),
    ]);
    const facts = assembleFacts([...productFacts, ...offerFacts]);

    const markets: TargetMarketContext[] = targetMarkets.map((market) => ({
      id: market.id,
      countries: [market.country],
      industries: [],
      companyTypes: [market.segment],
      buyerTitles: [],
      requirements: [],
      exclusions: [],
    }));

    return {
      schemaVersion: SCHEMA_VERSION,
      contextVersion: opportunity.contextVersion,
      frozenAt: new Date().toISOString(),
      scope: { targetMarketIds: targetMarkets.map((market) => market.id) },
      opportunity: {
        id: opportunity.id,
        name: opportunity.name,
        objective: opportunity.objective ?? '',
        status: opportunity.lifecycleStatus,
      },
      product: {
        id: product.id,
        name: product.name,
        category: product.category ?? '',
      },
      offer: {
        id: offer.id,
        name: offer.name,
        deliveryTerms: [],
        certifications: [],
      },
      facts: {
        confirmed: facts.confirmed,
        pending: facts.pending,
        restricted: facts.restricted,
      },
      unknowns: facts.unknowns,
      targetMarkets: markets,
      priorResearchRuns: [],
      existingCompanies: [],
      approvedKnowledge: { buyerPersonas: [], valuePropositions: [] },
      humanDecisions: [],
    };
  }
}
