import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { SecurityModule } from './security/security.module.js';
import { HealthController } from './health/health.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ProductsAndOffersModule } from './modules/products-and-offers/products-and-offers.module.js';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module.js';
import { ControlPlaneModule } from './modules/control-plane/control-plane.module.js';
import { MarketResearcherModule } from './modules/market-researcher/market-researcher.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { LeadDiscovererModule } from './modules/lead-discoverer/lead-discoverer.module.js';
import { ContactDiscoveryModule } from './modules/contact-discovery/contact-discovery.module.js';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule,
    OpportunitiesModule,
    ProductsAndOffersModule,
    ControlPlaneModule,
    MarketResearcherModule,
    EvidenceModule,
    LeadDiscovererModule,
    ContactDiscoveryModule,
  ],
  controllers: [HealthController, ReadinessController],
})
export class AppModule {}
