import { Module } from '@nestjs/common';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { MarketResearcherModule } from '../market-researcher/market-researcher.module.js';
import { PriceInquiryModule } from '../price-inquiry/price-inquiry.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { QuoteCollectionModule } from '../quote-collection/quote-collection.module.js';
import { ResearchResultService } from './application/research-result.service.js';
import { ResearchResultController } from './presentation/research-result.controller.js';

/**
 * Read/compose model for a publishable research result. Owns no tables; it
 * composes the frozen result (owner `market-researcher`) with live data from
 * `price-inquiry`, `evidence`, `lead-discoverer` and `quote-collection`.
 */
@Module({
  imports: [
    MarketResearcherModule,
    PriceInquiryModule,
    EvidenceModule,
    LeadDiscovererModule,
    ProductsAndOffersModule,
    QuoteCollectionModule,
  ],
  controllers: [ResearchResultController],
  providers: [ResearchResultService],
  exports: [ResearchResultService],
})
export class ResearchResultModule {}
