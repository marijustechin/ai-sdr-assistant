import { Module } from '@nestjs/common';
import { EmailAccountsRepository } from './infrastructure/email-accounts.repository.js';
import { EmailAccountsService } from './application/email-accounts.service.js';
import { EmailAccountsController } from './presentation/email-accounts.controller.js';

@Module({
  controllers: [EmailAccountsController],
  providers: [EmailAccountsRepository, EmailAccountsService],
  exports: [EmailAccountsService],
})
export class EmailAccountsModule {}
