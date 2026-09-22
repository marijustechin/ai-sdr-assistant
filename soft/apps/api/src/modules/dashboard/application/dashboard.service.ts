import { Inject, Injectable } from '@nestjs/common';
import type { DashboardSummary } from '@ai-sdr/contracts';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import { MarketResearcherService } from '../../market-researcher/application/research-runs.service.js';
import { OutreachDrafterService } from '../../outreach-drafter/application/outreach-drafter.service.js';
import { ProductsAndOffersService } from '../../products-and-offers/application/products-and-offers.service.js';

/**
 * Read-only admin summary composition. This module owns **no tables**: it only
 * asks each owning module's application service for counts, so table ownership
 * and status semantics stay with the owner. It introduces no derived commercial
 * metric (no conversion, sends, replies, or revenue).
 */
@Injectable()
export class DashboardService {
  constructor(
    @Inject(ProductsAndOffersService)
    private readonly products: ProductsAndOffersService,
    @Inject(MarketResearcherService)
    private readonly researchRuns: MarketResearcherService,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(OutreachDrafterService)
    private readonly outreachDrafts: OutreachDrafterService,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const [products, researchRuns, leads, outreachDrafts] = await Promise.all([
      this.products.countProductsByLifecycle(),
      this.researchRuns.countRuns(),
      this.leads.countLeads(),
      this.outreachDrafts.countDrafts(),
    ]);

    return {
      products,
      researchRuns,
      leads: { total: leads },
      outreachDrafts,
    };
  }
}
