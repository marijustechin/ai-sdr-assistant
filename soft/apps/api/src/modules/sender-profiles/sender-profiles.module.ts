import { Module } from '@nestjs/common';
import { EmailAccountsModule } from '../email-accounts/email-accounts.module.js';
import { SenderProfilesRepository } from './infrastructure/sender-profiles.repository.js';
import { SenderProfilesService } from './application/sender-profiles.service.js';
import { SenderProfilesController } from './presentation/sender-profiles.controller.js';

@Module({
  imports: [EmailAccountsModule],
  controllers: [SenderProfilesController],
  providers: [SenderProfilesRepository, SenderProfilesService],
  exports: [SenderProfilesService],
})
export class SenderProfilesModule {}
