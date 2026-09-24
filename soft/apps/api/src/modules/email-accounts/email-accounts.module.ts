import { Module } from '@nestjs/common';
import { EmailAccountsRepository } from './infrastructure/email-accounts.repository.js';
import { EmailAccountsService } from './application/email-accounts.service.js';
import { MailboxVerifierService } from './application/mailbox-verifier.service.js';
import { SmtpOutboundMailAdapter } from './application/outbound-mail.adapter.js';
import { ImapInboundMailAdapter } from './application/inbound-mail.adapter.js';
import {
  InboundMailPort,
  OutboundMailPort,
} from './domain/messaging.js';
import { EmailAccountsController } from './presentation/email-accounts.controller.js';

@Module({
  controllers: [EmailAccountsController],
  providers: [
    EmailAccountsRepository,
    EmailAccountsService,
    MailboxVerifierService,
    { provide: OutboundMailPort, useClass: SmtpOutboundMailAdapter },
    { provide: InboundMailPort, useClass: ImapInboundMailAdapter },
  ],
  exports: [EmailAccountsService, OutboundMailPort, InboundMailPort],
})
export class EmailAccountsModule {}
