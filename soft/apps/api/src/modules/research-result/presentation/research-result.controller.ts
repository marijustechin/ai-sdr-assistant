import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ResearchResultService } from '../application/research-result.service.js';

/**
 * Publishable market-research result for a run. `finalize` is a human action:
 * it freezes the snapshot and completes the run (with or without pending
 * supplier clarifications). Read-only afterwards (later replies enrich it).
 */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class ResearchResultController {
  constructor(
    @Inject(ResearchResultService)
    private readonly service: ResearchResultService,
  ) {}

  @Get(':opportunityId/research-runs/:runId/result')
  async getResult(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.getResult(opportunityId, runId);
  }

  /** Bodyless human action; no request body is accepted. */
  @Post(':opportunityId/research-runs/:runId/finalize')
  async finalize(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.finalize(opportunityId, runId);
  }
}
