import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateOutreachBatchSchema,
  type CreateOutreachBatchInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OutreachDrafterService } from '../application/outreach-drafter.service.js';

/**
 * Batch/campaign outreach review. Drafts are generated and approved as a whole
 * for one opportunity scope; per-recipient approval is not required. Approval
 * freezes the exact version of every included draft. **No sending exists** — the
 * APPROVED/QUEUED/SENDING/SENT lifecycle is reserved for a future send worker.
 */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class OutreachBatchesController {
  constructor(
    @Inject(OutreachDrafterService)
    private readonly service: OutreachDrafterService,
  ) {}

  @Post(':opportunityId/outreach-batches')
  async create(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Body(new ZodValidationPipe(CreateOutreachBatchSchema))
    body: CreateOutreachBatchInput,
  ) {
    return this.service.createBatch(opportunityId, body);
  }

  @Get(':opportunityId/outreach-batches')
  async list(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
  ) {
    return this.service.listBatches(opportunityId);
  }

  @Get(':opportunityId/outreach-batches/:batchId')
  async getOne(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.getBatch(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/approve')
  async approve(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.approveBatch(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/regenerate')
  async regenerate(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.regenerateBatch(opportunityId, batchId);
  }
}
