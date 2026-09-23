import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateEmailAccountSchema,
  MailboxTestSendSchema,
  UpdateEmailAccountSchema,
  type CreateEmailAccountInput,
  type MailboxTestSendInput,
  type UpdateEmailAccountInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { EmailAccountsService } from '../application/email-accounts.service.js';
import { MailboxVerifierService } from '../application/mailbox-verifier.service.js';

@Controller('email-accounts')
@UseGuards(InternalApiKeyGuard)
export class EmailAccountsController {
  constructor(
    @Inject(EmailAccountsService)
    private readonly service: EmailAccountsService,
    @Inject(MailboxVerifierService)
    private readonly verifier: MailboxVerifierService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateEmailAccountSchema))
    body: CreateEmailAccountInput,
  ) {
    return this.service.create(body);
  }

  @Get()
  async list() {
    return this.service.list();
  }

  @Get(':accountId')
  async getOne(@Param('accountId', new ParseUUIDPipe()) accountId: string) {
    return this.service.getAccountOrThrow(accountId);
  }

  @Patch(':accountId')
  async update(
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
    @Body(new ZodValidationPipe(UpdateEmailAccountSchema))
    body: UpdateEmailAccountInput,
  ) {
    return this.service.update(accountId, body);
  }

  /** Bounded SMTP authentication check; sends nothing. */
  @Post(':accountId/verify-smtp')
  async verifySmtp(
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
  ) {
    return this.verifier.verifySmtp(accountId);
  }

  /** Bounded IMAP authentication + INBOX header check; ingests nothing. */
  @Post(':accountId/verify-imap')
  async verifyImap(
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
  ) {
    return this.verifier.verifyImap(accountId);
  }

  /** Sends exactly one controlled test message (explicit `confirm: true`). */
  @Post(':accountId/test-send')
  async testSend(
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
    @Body(new ZodValidationPipe(MailboxTestSendSchema))
    body: MailboxTestSendInput,
  ) {
    return this.verifier.testSend(accountId, body.to);
  }
}
