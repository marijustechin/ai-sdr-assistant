import { Module } from '@nestjs/common';
import { OpportunitiesModule } from '../opportunities/opportunities.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { ResearchContextService } from './application/research-context.service.js';
import { ResearchContextController } from './presentation/research-context.controller.js';

@Module({
  imports: [OpportunitiesModule, ProductsAndOffersModule],
  controllers: [ResearchContextController],
  providers: [ResearchContextService],
  exports: [ResearchContextService],
})
export class ControlPlaneModule {}
