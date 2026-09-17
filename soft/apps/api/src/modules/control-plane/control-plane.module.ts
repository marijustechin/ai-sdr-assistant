import { Module } from '@nestjs/common';
import { OpportunitiesModule } from '../opportunities/opportunities.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { MarketResearcherModule } from '../market-researcher/market-researcher.module.js';
import { ResearchContextService } from './application/research-context.service.js';
import { ResearchRequestsService } from './application/research-requests.service.js';
import { ResearchContextController } from './presentation/research-context.controller.js';
import { ResearchRequestsController } from './presentation/research-requests.controller.js';

@Module({
  imports: [
    OpportunitiesModule,
    ProductsAndOffersModule,
    MarketResearcherModule,
  ],
  controllers: [ResearchContextController, ResearchRequestsController],
  providers: [ResearchContextService, ResearchRequestsService],
  exports: [ResearchContextService, ResearchRequestsService],
})
export class ControlPlaneModule {}
