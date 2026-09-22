import { Module } from '@nestjs/common';
import { ContactDiscoveryModule } from '../contact-discovery/contact-discovery.module.js';
import { ControlPlaneModule } from '../control-plane/control-plane.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { SenderProfilesModule } from '../sender-profiles/sender-profiles.module.js';
import { OutreachDraftRepository } from './infrastructure/outreach-draft.repository.js';
import { OutreachDrafterService } from './application/outreach-drafter.service.js';
import { OutreachDraftsController } from './presentation/outreach-drafts.controller.js';

@Module({
  imports: [
    LeadDiscovererModule,
    ContactDiscoveryModule,
    ControlPlaneModule,
    ProductsAndOffersModule,
    SenderProfilesModule,
  ],
  controllers: [OutreachDraftsController],
  providers: [OutreachDraftRepository, OutreachDrafterService],
  exports: [OutreachDrafterService],
})
export class OutreachDrafterModule {}
