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
  SendPriceInquirySchema,
  type SendPriceInquiryInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { QuoteCollectionService } from '../application/quote-collection.service.js';

/**
 * Market-research supplier quote collection. Sending and reply checking are
 * explicit, confirmed human actions; nothing here runs automatically and no
 * transport credentials are ever returned.
 */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class QuoteCollectionController {
  constructor(
    @Inject(QuoteCollectionService)
    private readonly service: QuoteCollectionService,
  ) {}

  @Post(
    ':opportunityId/leads/:leadId/price-inquiry-drafts/:draftId/send',
  )
  async send(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Param('draftId', new ParseUUIDPipe()) draftId: string,
    @Body(new ZodValidationPipe(SendPriceInquirySchema))
    body: SendPriceInquiryInput,
  ) {
    // `body.confirm === true` is enforced by the schema; the value itself is
    // not otherwise needed.
    void body;
    return this.service.sendRfq(opportunityId, leadId, draftId);
  }

  @Post(
    ':opportunityId/leads/:leadId/price-inquiry-drafts/:draftId/check-replies',
  )
  async checkReplies(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Param('draftId', new ParseUUIDPipe()) draftId: string,
  ) {
    return this.service.checkReplies(opportunityId, leadId, draftId);
  }

  @Get(':opportunityId/leads/:leadId/quote-collection')
  async list(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
  ) {
    return this.service.listCollection(opportunityId, leadId);
  }
}
