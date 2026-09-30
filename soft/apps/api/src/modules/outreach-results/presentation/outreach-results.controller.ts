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
  ClassifyOutreachReplySchema,
  ScanOutreachRepliesSchema,
  type ClassifyOutreachReplyInput,
  type ScanOutreachRepliesInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OutreachResultsService } from '../application/outreach-results.service.js';

/**
 * Outreach results / campaign summary. Read-only correlation + classification of
 * inbound replies for a batch, plus scan and human-override actions. Nothing here
 * sends: a positive reply hands off to a human and never triggers a follow-up.
 */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class OutreachResultsController {
  constructor(
    @Inject(OutreachResultsService)
    private readonly service: OutreachResultsService,
  ) {}

  @Get(':opportunityId/outreach-batches/:batchId/results')
  async results(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.getBatchResults(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/results/scan')
  async scan(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Body(new ZodValidationPipe(ScanOutreachRepliesSchema))
    body: ScanOutreachRepliesInput,
  ) {
    return this.service.scanBatchReplies(opportunityId, batchId, body);
  }

  @Patch(':opportunityId/outreach-batches/:batchId/results/replies/:replyId')
  async override(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
    @Body(new ZodValidationPipe(ClassifyOutreachReplySchema))
    body: ClassifyOutreachReplyInput,
  ) {
    return this.service.overrideClassification(
      opportunityId,
      batchId,
      replyId,
      body,
    );
  }
}
