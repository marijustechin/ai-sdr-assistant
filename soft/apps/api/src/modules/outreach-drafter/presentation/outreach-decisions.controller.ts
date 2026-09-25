import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  SetOutreachDecisionSchema,
  type SetOutreachDecisionInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { OutreachDrafterService } from '../application/outreach-drafter.service.js';

/**
 * Human outreach eligibility decisions, scoped to **one opportunity + company**
 * (never lead-dependent). Company routes are canonical; the research-offering
 * routes are a convenience that resolves the offering's company. All routes read
 * and write the same authoritative `outreach_decisions` record.
 */
@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class OutreachDecisionsController {
  constructor(
    @Inject(OutreachDrafterService)
    private readonly service: OutreachDrafterService,
  ) {}

  @Get(':opportunityId/companies/:companyId/outreach-decision')
  async getForCompany(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.service.getDecisionForCompany(opportunityId, companyId);
  }

  @Put(':opportunityId/companies/:companyId/outreach-decision')
  async setForCompany(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body(new ZodValidationPipe(SetOutreachDecisionSchema))
    body: SetOutreachDecisionInput,
  ) {
    return this.service.setDecisionForCompany(opportunityId, companyId, body);
  }

  @Get(':opportunityId/research-offerings/:offeringId/outreach-decision')
  async getForOffering(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('offeringId', new ParseUUIDPipe()) offeringId: string,
  ) {
    return this.service.getDecisionForOffering(opportunityId, offeringId);
  }

  @Put(':opportunityId/research-offerings/:offeringId/outreach-decision')
  async setForOffering(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('offeringId', new ParseUUIDPipe()) offeringId: string,
    @Body(new ZodValidationPipe(SetOutreachDecisionSchema))
    body: SetOutreachDecisionInput,
  ) {
    return this.service.setDecisionForOffering(opportunityId, offeringId, body);
  }
}
