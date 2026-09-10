import {
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateTargetMarketSchema,
  type CreateTargetMarketInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OpportunitiesService } from '../application/opportunities.service.js';

@Controller('target-markets')
@UseGuards(InternalApiKeyGuard)
export class TargetMarketsController {
  constructor(
    @Inject(OpportunitiesService)
    private readonly service: OpportunitiesService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateTargetMarketSchema))
    body: CreateTargetMarketInput,
  ) {
    return this.service.createTargetMarket(body);
  }
}
