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
  RunOutreachSendSchema,
  SendOutreachTestPreviewSchema,
  type RunOutreachSendInput,
  type SendOutreachTestPreviewInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OutreachSenderService } from '../application/outreach-sender.service.js';

/**
 * Outreach batch sending. Starting is an explicit human action; the worker only
 * sends pre-approved frozen snapshots and never regenerates content. Approving a
 * batch does **not** start sending.
 */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class OutreachSendController {
  constructor(
    @Inject(OutreachSenderService)
    private readonly service: OutreachSenderService,
  ) {}

  @Get(':opportunityId/outreach-batches/:batchId/send-state')
  async getState(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.getSendState(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/start-sending')
  async start(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.startSending(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/pause')
  async pause(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.pause(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/resume')
  async resume(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.resume(opportunityId, batchId);
  }

  @Post(':opportunityId/outreach-batches/:batchId/run-due')
  async runDue(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Body(new ZodValidationPipe(RunOutreachSendSchema))
    body: RunOutreachSendInput,
  ) {
    // The batch id is validated for scope; the worker processes all due rows.
    await this.service.getSendState(opportunityId, batchId);
    return this.service.processDue(body.limit);
  }

  @Post(':opportunityId/outreach-batches/:batchId/retry-sent-copy')
  async retrySentCopy(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.retrySentCopy(opportunityId, batchId);
  }

  /**
   * Controlled **send-test preview** (human visual verification). Read-only
   * surface listing selectable drafts, the test-recipient allowlist and recent
   * test deliveries. Production recipients/state are never touched.
   */
  @Get(':opportunityId/outreach-batches/:batchId/test-preview')
  async getTestPreview(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.getTestPreview(opportunityId, batchId);
  }

  /**
   * Sends the actual prepared content to explicit allowlisted **test**
   * recipients only. Never contacts the real draft recipient, never advances
   * batch/send state or pacing, never marks the real recipient contacted.
   */
  @Post(':opportunityId/outreach-batches/:batchId/test-preview')
  async sendTestPreview(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
    @Body(new ZodValidationPipe(SendOutreachTestPreviewSchema))
    body: SendOutreachTestPreviewInput,
  ) {
    return this.service.sendTestPreview(opportunityId, batchId, body);
  }

  /** Retries the Sent append for test copies only (never re-submits SMTP). */
  @Post(':opportunityId/outreach-batches/:batchId/test-preview/retry-sent-copy')
  async retryTestSentCopy(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.retryTestSentCopy(opportunityId, batchId);
  }

  /** Cancels/archives a batch (never deleted); a cancelled batch cannot send. */
  @Post(':opportunityId/outreach-batches/:batchId/cancel')
  async cancel(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('batchId', new ParseUUIDPipe()) batchId: string,
  ) {
    return this.service.cancelBatch(opportunityId, batchId);
  }
}
