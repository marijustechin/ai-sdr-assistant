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
  PrepareOutreachDraftSchema,
  type PrepareOutreachDraftInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OutreachDrafterService } from '../application/outreach-drafter.service.js';

@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class OutreachDraftsController {
  constructor(
    @Inject(OutreachDrafterService)
    private readonly service: OutreachDrafterService,
  ) {}

  @Post(':opportunityId/leads/:leadId/outreach-drafts')
  async prepareDraft(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Body(new ZodValidationPipe(PrepareOutreachDraftSchema))
    body: PrepareOutreachDraftInput,
  ) {
    return this.service.prepareDraft(opportunityId, leadId, body);
  }

  @Get(':opportunityId/leads/:leadId/outreach-drafts')
  async listDrafts(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
  ) {
    return this.service.listDrafts(opportunityId, leadId);
  }

  @Get(':opportunityId/leads/:leadId/outreach-drafts/:draftId')
  async getDraft(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Param('draftId', new ParseUUIDPipe()) draftId: string,
  ) {
    return this.service.getDraft(opportunityId, leadId, draftId);
  }
}
