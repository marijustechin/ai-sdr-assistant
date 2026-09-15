import { Module } from '@nestjs/common';
import { MarketResearcherModule } from '../market-researcher/market-researcher.module.js';
import { EvidenceRepository } from './infrastructure/evidence.repository.js';
import { EvidenceService } from './application/evidence.service.js';
import { EvidenceController } from './presentation/evidence.controller.js';

@Module({
  imports: [MarketResearcherModule],
  controllers: [EvidenceController],
  providers: [EvidenceRepository, EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
