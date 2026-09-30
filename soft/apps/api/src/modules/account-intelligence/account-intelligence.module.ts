import { Module } from '@nestjs/common';
import { ContactDiscoveryModule } from '../contact-discovery/contact-discovery.module.js';
import { ControlPlaneModule } from '../control-plane/control-plane.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { OutreachDrafterModule } from '../outreach-drafter/outreach-drafter.module.js';
import { OutreachResultsModule } from '../outreach-results/outreach-results.module.js';
import { OutreachSenderModule } from '../outreach-sender/outreach-sender.module.js';
import { AccountIntelligenceService } from './application/account-intelligence.service.js';
import { CompanyBriefRepository } from './infrastructure/company-brief.repository.js';
import { AccountIntelligenceController } from './presentation/account-intelligence.controller.js';

/**
 * Account Intelligence / Company Brief. Owns `company_briefs` and their
 * snapshots. It reuses research/evidence/contact/outreach data through the
 * owning modules' application services and never duplicates company identity.
 * Stage-2 public-data research is performed by the research harness, which
 * submits structured findings back through this module.
 */
@Module({
  imports: [
    LeadDiscovererModule,
    ContactDiscoveryModule,
    OutreachDrafterModule,
    OutreachSenderModule,
    OutreachResultsModule,
    ControlPlaneModule,
  ],
  controllers: [AccountIntelligenceController],
  providers: [CompanyBriefRepository, AccountIntelligenceService],
  exports: [AccountIntelligenceService],
})
export class AccountIntelligenceModule {}
