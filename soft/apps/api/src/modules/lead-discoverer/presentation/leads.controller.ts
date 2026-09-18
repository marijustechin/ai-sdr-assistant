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
  CreateLeadSchema,
  UpdateLeadReviewSchema,
  type CreateLeadInput,
  type UpdateLeadReviewInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { LeadDiscovererService } from '../application/lead-discoverer.service.js';

@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class LeadsController {
  constructor(
    @Inject(LeadDiscovererService)
    private readonly service: LeadDiscovererService,
  ) {}

  @Post(':opportunityId/leads')
  async createLead(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Body(new ZodValidationPipe(CreateLeadSchema)) body: CreateLeadInput,
  ) {
    return this.service.createLead(opportunityId, body);
  }

  @Get(':opportunityId/leads')
  async listLeads(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
  ) {
    return this.service.listLeads(opportunityId);
  }

  @Get(':opportunityId/leads/:leadId')
  async getLead(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
  ) {
    return this.service.getLead(opportunityId, leadId);
  }

  @Patch(':opportunityId/leads/:leadId')
  async reviewLead(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('leadId', new ParseUUIDPipe()) leadId: string,
    @Body(new ZodValidationPipe(UpdateLeadReviewSchema))
    body: UpdateLeadReviewInput,
  ) {
    return this.service.reviewLead(opportunityId, leadId, body);
  }
}
