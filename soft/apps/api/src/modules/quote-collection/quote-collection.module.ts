import { Module } from '@nestjs/common';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { PriceInquiryModule } from '../price-inquiry/price-inquiry.module.js';
import { SenderProfilesModule } from '../sender-profiles/sender-profiles.module.js';
import { QuoteCollectionRepository } from './infrastructure/quote-collection.repository.js';
import { QuoteCollectionService } from './application/quote-collection.service.js';
import { QuoteCollectionController } from './presentation/quote-collection.controller.js';

/**
 * Owns the market-research supplier quote-collection loop. Depends on the
 * `price-inquiry` owner for draft lifecycle writes, `sender-profiles` and
 * `email-accounts` for identity/transport, `evidence` for run linkage, and
 * `lead-discoverer` for the lead's research run.
 */
@Module({
  imports: [
    PriceInquiryModule,
    SenderProfilesModule,
    EmailAccountsModule,
    LeadDiscovererModule,
    EvidenceModule,
  ],
  controllers: [QuoteCollectionController],
  providers: [QuoteCollectionRepository, QuoteCollectionService],
  exports: [QuoteCollectionService],
})
export class QuoteCollectionModule {}
