import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CorrectClaimSchema,
  CreateOfferingSchema,
  PersistClaimSchema,
  PersistEvidenceSchema,
  RegisterSourceSchema,
  type CorrectClaimInput,
  type CreateOfferingInput,
  type PersistClaimInput,
  type PersistEvidenceInput,
  type RegisterSourceInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { EvidenceService } from '../application/evidence.service.js';

@Controller('opportunities')
@UseGuards(InternalApiKeyGuard)
export class EvidenceController {
  constructor(
    @Inject(EvidenceService)
    private readonly service: EvidenceService,
  ) {}

  @Post(':opportunityId/research-runs/:runId/sources')
  async registerSource(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body(new ZodValidationPipe(RegisterSourceSchema)) body: RegisterSourceInput,
  ) {
    return this.service.registerSource(opportunityId, runId, body);
  }

  @Get(':opportunityId/research-runs/:runId/sources')
  async listSources(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.listSources(opportunityId, runId);
  }

  @Post(':opportunityId/research-runs/:runId/evidence')
  async persistEvidence(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body(new ZodValidationPipe(PersistEvidenceSchema))
    body: PersistEvidenceInput,
  ) {
    return this.service.persistEvidence(opportunityId, runId, body);
  }

  @Get(':opportunityId/research-runs/:runId/evidence')
  async listEvidence(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.listEvidence(opportunityId, runId);
  }

  @Post(':opportunityId/research-runs/:runId/claims')
  async persistClaim(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body(new ZodValidationPipe(PersistClaimSchema)) body: PersistClaimInput,
  ) {
    return this.service.persistClaim(opportunityId, runId, body);
  }

  @Get(':opportunityId/research-runs/:runId/claims')
  async listClaims(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Query('includeHistory') includeHistory?: string,
  ) {
    return this.service.listClaims(
      opportunityId,
      runId,
      includeHistory === 'true',
    );
  }

  @Post(':opportunityId/research-runs/:runId/claims/:claimId/corrections')
  async correctClaim(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Param('claimId', new ParseUUIDPipe()) claimId: string,
    @Body(new ZodValidationPipe(CorrectClaimSchema)) body: CorrectClaimInput,
  ) {
    return this.service.correctClaim(opportunityId, runId, claimId, body);
  }

  @Post(':opportunityId/research-runs/:runId/offerings')
  async createOffering(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body(new ZodValidationPipe(CreateOfferingSchema)) body: CreateOfferingInput,
  ) {
    return this.service.createOffering(opportunityId, runId, body);
  }

  @Get(':opportunityId/research-runs/:runId/offerings')
  async listOfferings(
    @Param('opportunityId', new ParseUUIDPipe()) opportunityId: string,
    @Param('runId', new ParseUUIDPipe()) runId: string,
  ) {
    return this.service.listOfferings(opportunityId, runId);
  }
}
