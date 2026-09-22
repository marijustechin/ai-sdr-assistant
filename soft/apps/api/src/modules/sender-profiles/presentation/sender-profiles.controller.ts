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
  CreateSenderProfileSchema,
  UpdateSenderProfileSchema,
  type CreateSenderProfileInput,
  type UpdateSenderProfileInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { SenderProfilesService } from '../application/sender-profiles.service.js';

@Controller('sender-profiles')
@UseGuards(InternalApiKeyGuard)
export class SenderProfilesController {
  constructor(
    @Inject(SenderProfilesService)
    private readonly service: SenderProfilesService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateSenderProfileSchema))
    body: CreateSenderProfileInput,
  ) {
    return this.service.create(body);
  }

  @Get()
  async list() {
    return this.service.list();
  }

  @Get(':profileId')
  async getOne(@Param('profileId', new ParseUUIDPipe()) profileId: string) {
    return this.service.getProfileOrThrow(profileId);
  }

  @Patch(':profileId')
  async update(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
    @Body(new ZodValidationPipe(UpdateSenderProfileSchema))
    body: UpdateSenderProfileInput,
  ) {
    return this.service.update(profileId, body);
  }
}
