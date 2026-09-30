import { Module } from '@nestjs/common';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { OutreachDrafterModule } from '../outreach-drafter/outreach-drafter.module.js';
import { OutreachSenderModule } from '../outreach-sender/outreach-sender.module.js';
import { OutreachResultsService } from './application/outreach-results.service.js';
import { OutreachReplyRepository } from './infrastructure/outreach-reply.repository.js';
import { OutreachResultsController } from './presentation/outreach-results.controller.js';

/**
 * Outreach results / campaign summary. Owns `outreach_replies`; it reads the
 * sent outbound via `outreach-sender` and the batch via `outreach-drafter`, and
 * uses the `email-accounts` inbound port to scan for replies. It never sends.
 */
@Module({
  imports: [
    OutreachDrafterModule,
    OutreachSenderModule,
    LeadDiscovererModule,
    EmailAccountsModule,
  ],
  controllers: [OutreachResultsController],
  providers: [OutreachReplyRepository, OutreachResultsService],
  exports: [OutreachResultsService],
})
export class OutreachResultsModule {}
