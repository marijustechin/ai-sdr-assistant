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
  RequestCompanyEnrichmentSchema,
  SubmitCompanyEnrichmentSchema,
  type RequestCompanyEnrichmentInput,
  type SubmitCompanyEnrichmentInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { AccountIntelligenceService } from '../application/account-intelligence.service.js';

/**
 * Account Intelligence / Company Brief. A brief is prepared/refreshed by a human
 * for a positive handoff; Stage-2 enrichment findings are submitted by the
 * research harness. Nothing here researches the web or sends email.
 */
@Controller()
@UseGuards(InternalApiKeyGuard)
export class AccountIntelligenceController {
  constructor(
    @Inject(AccountIntelligenceService)
    private readonly service: AccountIntelligenceService,
  ) {}

  @Post('opportunities/:opportunityId/companies/:companyId/brief')
  async prepare(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.service.prepareBrief(opportunityId, companyId);
  }

  @Post('opportunities/:opportunityId/companies/:companyId/brief/refresh')
  async refresh(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.service.prepareBrief(opportunityId, companyId, { refresh: true });
  }

  @Get('opportunities/:opportunityId/companies/:companyId/brief')
  async get(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.service.getBrief(opportunityId, companyId);
  }

  @Post('opportunities/:opportunityId/companies/:companyId/brief/request-enrichment')
  async requestEnrichment(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body(new ZodValidationPipe(RequestCompanyEnrichmentSchema))
    body: RequestCompanyEnrichmentInput,
  ) {
    return this.service.requestEnrichment(
      opportunityId,
      companyId,
      body.note ?? null,
    );
  }

  @Post('company-briefs/:briefId/enrichment')
  async submitEnrichment(
    @Param('briefId', new ParseUUIDPipe()) briefId: string,
    @Body(new ZodValidationPipe(SubmitCompanyEnrichmentSchema))
    body: SubmitCompanyEnrichmentInput,
  ) {
    return this.service.submitEnrichment(briefId, body);
  }
}
