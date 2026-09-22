import { Module } from '@nestjs/common';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { MarketResearcherModule } from '../market-researcher/market-researcher.module.js';
import { OutreachDrafterModule } from '../outreach-drafter/outreach-drafter.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { DashboardService } from './application/dashboard.service.js';
import { DashboardController } from './presentation/dashboard.controller.js';

/**
 * Read-only admin dashboard composition layer. It owns no tables and no domain
 * logic; it consumes the owning modules' application services.
 */
@Module({
  imports: [
    ProductsAndOffersModule,
    MarketResearcherModule,
    LeadDiscovererModule,
    OutreachDrafterModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
