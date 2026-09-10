import {
  Body,
  Controller,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AttachTargetMarketSchema,
  CreateOpportunitySchema,
  type AttachTargetMarketInput,
  type CreateOpportunityInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OpportunitiesService } from '../application/opportunities.service.js';

@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class OpportunitiesController {
  constructor(
    @Inject(OpportunitiesService)
    private readonly service: OpportunitiesService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateOpportunitySchema))
    body: CreateOpportunityInput,
  ) {
    return this.service.createOpportunity(body);
  }

  @Post(':opportunityId/target-markets')
  async attachTargetMarket(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Body(new ZodValidationPipe(AttachTargetMarketSchema))
    body: AttachTargetMarketInput,
  ) {
    return this.service.attachTargetMarket(opportunityId, body.targetMarketId);
  }
}
