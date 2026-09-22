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
  UpdateEmailAccountSchema,
  type CreateEmailAccountInput,
  type UpdateEmailAccountInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { EmailAccountsService } from '../application/email-accounts.service.js';

@Controller('email-accounts')
@UseGuards(InternalApiKeyGuard)
export class EmailAccountsController {
  constructor(
    @Inject(EmailAccountsService)
    private readonly service: EmailAccountsService,
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
}
