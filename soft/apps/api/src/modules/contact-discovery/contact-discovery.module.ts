import { Module } from '@nestjs/common';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { ContactRepository } from './infrastructure/contact.repository.js';
import { ContactDiscoveryService } from './application/contact-discovery.service.js';
import { ContactsController } from './presentation/contacts.controller.js';

@Module({
  imports: [LeadDiscovererModule, EvidenceModule],
  controllers: [ContactsController],
  providers: [ContactRepository, ContactDiscoveryService],
  exports: [ContactDiscoveryService],
})
export class ContactDiscoveryModule {}
