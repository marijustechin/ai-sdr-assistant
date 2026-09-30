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
  OutreachMessageStrategySchema,
  ReopenOutreachBatchSchema,
  type CreateOutreachBatchInput,
  type OutreachMessageStrategy,
  type ReopenOutreachBatchInput,
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

  /**
   * Explicitly reopens an APPROVED (not-yet-started) batch for editing: the
   * batch returns to DRAFT, approved versions are kept as immutable history, and
   * a later apply-message creates new PENDING versions.
   */
  @Post(':opportunityId/outreach-batches/:batchId/reopen')
  async reopen(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Body(new ZodValidationPipe(ReopenOutreachBatchSchema))
    body: ReopenOutreachBatchInput,
  ) {
    return this.service.reopenBatchForEditing(opportunityId, batchId, body);
  }

  /**
   * Applies a shared batch-level message strategy (subject / proposition /
   * commercial terms / CTA) and regenerates the batch's non-customized current
   * drafts as NEW pending versions. Previously approved versions are never
   * mutated; an APPROVED batch must be reopened first.
   */
  @Post(':opportunityId/outreach-batches/:batchId/apply-message')
  async applyMessage(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Body(new ZodValidationPipe(OutreachMessageStrategySchema))
    body: OutreachMessageStrategy,
  ) {
    return this.service.applyBatchMessage(opportunityId, batchId, body);
  }
}
