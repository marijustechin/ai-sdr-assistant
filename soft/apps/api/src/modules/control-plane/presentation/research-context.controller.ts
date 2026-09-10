import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import type { ResearchContext } from '@ai-sdr/contracts';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ResearchContextService } from '../application/research-context.service.js';

@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class ResearchContextController {
  constructor(
    @Inject(ResearchContextService)
    private readonly service: ResearchContextService,
  ) {}

  @Get(':opportunityId/research-context')
  async get(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
  ): Promise<ResearchContext> {
    return this.service.getResearchContext(opportunityId);
  }
}
