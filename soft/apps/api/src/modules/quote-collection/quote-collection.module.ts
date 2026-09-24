import { Module } from '@nestjs/common';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { MarketResearcherModule } from '../market-researcher/market-researcher.module.js';
import { PriceInquiryModule } from '../price-inquiry/price-inquiry.module.js';
import { SenderProfilesModule } from '../sender-profiles/sender-profiles.module.js';
import { QuoteCollectionRepository } from './infrastructure/quote-collection.repository.js';
import { QuoteFollowUpRepository } from './infrastructure/quote-follow-up.repository.js';
import { QuoteCollectionService } from './application/quote-collection.service.js';
import { FollowUpService } from './application/follow-up.service.js';
import { FollowUpScheduler } from './application/follow-up-scheduler.service.js';
import { QuoteCollectionController } from './presentation/quote-collection.controller.js';

/**
 * Owns the market-research supplier quote-collection loop and its DB-backed
 * follow-up schedules. Depends on the `price-inquiry` owner for draft lifecycle
 * writes, `sender-profiles` and `email-accounts` for identity/transport,
 * `evidence` for run linkage, `lead-discoverer` for the lead's research run, and
 * `market-researcher` to record result enrichment.
 */
@Module({
  imports: [
    PriceInquiryModule,
    SenderProfilesModule,
    EmailAccountsModule,
    LeadDiscovererModule,
    EvidenceModule,
    MarketResearcherModule,
  ],
  controllers: [QuoteCollectionController],
  providers: [
    QuoteCollectionRepository,
    QuoteFollowUpRepository,
    QuoteCollectionService,
    FollowUpService,
    FollowUpScheduler,
  ],
  exports: [QuoteCollectionService, FollowUpService, QuoteFollowUpRepository],
})
export class QuoteCollectionModule {}
