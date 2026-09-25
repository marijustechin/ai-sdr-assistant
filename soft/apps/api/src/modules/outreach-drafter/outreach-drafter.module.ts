import { Module } from '@nestjs/common';
import { ContactDiscoveryModule } from '../contact-discovery/contact-discovery.module.js';
import { ControlPlaneModule } from '../control-plane/control-plane.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { SenderProfilesModule } from '../sender-profiles/sender-profiles.module.js';
import { OutreachDraftRepository } from './infrastructure/outreach-draft.repository.js';
import { OutreachDecisionRepository } from './infrastructure/outreach-decision.repository.js';
import { OutreachDrafterService } from './application/outreach-drafter.service.js';
import { OutreachDraftsController } from './presentation/outreach-drafts.controller.js';
import { OutreachDecisionsController } from './presentation/outreach-decisions.controller.js';

@Module({
  imports: [
    LeadDiscovererModule,
    ContactDiscoveryModule,
    ControlPlaneModule,
    EvidenceModule,
    ProductsAndOffersModule,
    SenderProfilesModule,
  ],
  controllers: [OutreachDraftsController, OutreachDecisionsController],
  providers: [
    OutreachDraftRepository,
    OutreachDecisionRepository,
    OutreachDrafterService,
  ],
  exports: [OutreachDrafterService],
})
export class OutreachDrafterModule {}
