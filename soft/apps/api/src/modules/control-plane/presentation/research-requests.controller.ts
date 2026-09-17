import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateResearchRequestSchema,
  type CreateResearchRequestInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ResearchRequestsService } from '../application/research-requests.service.js';

/**
 * Product-independent market research request flow (internal only).
 *
 * - `POST /research-requests` — submit a request (operator flow);
 * - `GET  /research-requests?status=QUEUED` — researcher discovery;
 * - `GET  /research-requests/:runId` — researcher intake (parameters + context).
 */
@Controller('research-requests')
@UseGuards(InternalApiKeyGuard)
export class ResearchRequestsController {
  constructor(
    @Inject(ResearchRequestsService)
    private readonly service: ResearchRequestsService,
  ) {}

  @Post()
  async submit(
    @Body(new ZodValidationPipe(CreateResearchRequestSchema))
    body: CreateResearchRequestInput,
  ) {
    return this.service.submit(body);
  }

  @Get()
  async list(@Query('status') status?: string) {
    const normalized = (status ?? 'QUEUED').toUpperCase();
    if (normalized !== 'QUEUED') {
      throw new BadRequestException({
        error: 'unsupported_status',
        supported: ['QUEUED'],
      });
    }
    return this.service.listQueued();
  }

  @Get(':runId')
  async intake(@Param('runId', new ParseUUIDPipe()) runId: string) {
    return this.service.getIntake(runId);
  }
}
