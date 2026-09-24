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
  CreatePriceInquiryDraftSchema,
  UpdatePriceInquiryDraftSchema,
  type CreatePriceInquiryDraftInput,
  type UpdatePriceInquiryDraftInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { PriceInquiryService } from '../application/price-inquiry.service.js';

/** Persisted price-inquiry (RFQ) drafts. Read-only review; nothing is sent. */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class PriceInquiryController {
  constructor(
    @Inject(PriceInquiryService)
    private readonly service: PriceInquiryService,
  ) {}

  @Post(':opportunityId/leads/:leadId/price-inquiry-drafts')
  async create(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Body(new ZodValidationPipe(CreatePriceInquiryDraftSchema))
    body: CreatePriceInquiryDraftInput,
  ) {
    return this.service.createDraft(opportunityId, leadId, body);
  }

  @Get(':opportunityId/leads/:leadId/price-inquiry-drafts')
  async list(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
  ) {
    return this.service.listDrafts(opportunityId, leadId);
  }

  @Get(':opportunityId/leads/:leadId/price-inquiry-drafts/:draftId')
  async get(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Param('draftId', new ParseUUIDPipe()) draftId: string,
  ) {
    return this.service.getDraft(opportunityId, leadId, draftId);
  }

  @Patch(':opportunityId/leads/:leadId/price-inquiry-drafts/:draftId')
  async update(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Param('draftId', new ParseUUIDPipe()) draftId: string,
    @Body(new ZodValidationPipe(UpdatePriceInquiryDraftSchema))
    body: UpdatePriceInquiryDraftInput,
  ) {
    return this.service.updateDraft(opportunityId, leadId, draftId, body);
  }
}
