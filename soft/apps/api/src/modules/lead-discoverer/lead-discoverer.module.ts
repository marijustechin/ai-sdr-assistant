import { Module } from '@nestjs/common';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { OpportunitiesModule } from '../opportunities/opportunities.module.js';
import { LeadRepository } from './infrastructure/lead.repository.js';
import { LeadDiscovererService } from './application/lead-discoverer.service.js';
import { LeadsController } from './presentation/leads.controller.js';

@Module({
  imports: [OpportunitiesModule, EvidenceModule],
  controllers: [LeadsController],
  providers: [LeadRepository, LeadDiscovererService],
  exports: [LeadDiscovererService],
})
export class LeadDiscovererModule {}
