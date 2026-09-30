import { Module } from '@nestjs/common';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module.js';
import { OutreachDrafterModule } from '../outreach-drafter/outreach-drafter.module.js';
import { OutreachOutboundRepository } from './infrastructure/outreach-outbound.repository.js';
import { OutreachTestDeliveryRepository } from './infrastructure/outreach-test-delivery.repository.js';
import { OutreachSenderService } from './application/outreach-sender.service.js';
import { OutreachSendScheduler } from './application/outreach-send-scheduler.service.js';
import { OutreachSendController } from './presentation/outreach-send.controller.js';

/**
 * Send layer for approved outreach batches. Owns `outreach_outbound_messages`
 * (the DB-backed queue/idempotency/pacing store) and the separate
 * `outreach_test_deliveries` (controlled send-test previews). It reads the
 * prepared/approved snapshot from `outreach-drafter` and uses `email-accounts`
 * transport ports; it never regenerates content and never sends without an
 * explicit human start.
 */
@Module({
  imports: [OutreachDrafterModule, EmailAccountsModule],
  controllers: [OutreachSendController],
  providers: [
    OutreachOutboundRepository,
    OutreachTestDeliveryRepository,
    OutreachSenderService,
    OutreachSendScheduler,
  ],
  exports: [OutreachSenderService],
})
export class OutreachSenderModule {}
