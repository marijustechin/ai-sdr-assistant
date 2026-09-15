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
  CreateResearchRunSchema,
  RecordResearchQuerySchema,
  UpdateResearchRunSchema,
  type RecordResearchQueryInput,
  type UpdateResearchRunInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { MarketResearcherService } from '../application/research-runs.service.js';

@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class ResearchRunsController {
  constructor(
    @Inject(MarketResearcherService)
    private readonly service: MarketResearcherService,
  ) {}

  /** Bodyless create; `CreateResearchRunSchema` rejects any unexpected fields. */
  @Post(':opportunityId/research-runs')
  async create(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Body(new ZodValidationPipe(CreateResearchRunSchema))
    body: Record<string, never>,
  ) {
    void body;
    return this.service.createRun(opportunityId);
  }

  @Get(':opportunityId/research-runs')
  async list(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
  ) {
    return this.service.listRuns(opportunityId);
  }

  @Get(':opportunityId/research-runs/:runId')
  async get(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.getRun(opportunityId, runId);
  }

  @Patch(':opportunityId/research-runs/:runId')
  async update(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body(new ZodValidationPipe(UpdateResearchRunSchema))
    body: UpdateResearchRunInput,
  ) {
    return this.service.updateRun(opportunityId, runId, body);
  }

  @Post(':opportunityId/research-runs/:runId/queries')
  async recordQuery(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body(new ZodValidationPipe(RecordResearchQuerySchema))
    body: RecordResearchQueryInput,
  ) {
    return this.service.recordQuery(opportunityId, runId, body);
  }

  @Get(':opportunityId/research-runs/:runId/queries')
  async listQueries(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.listQueries(opportunityId, runId);
  }
}
