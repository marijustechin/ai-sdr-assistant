import { Module } from '@nestjs/common';
import { OpportunitiesModule } from '../opportunities/opportunities.module.js';
import { ResearchRunsRepository } from './infrastructure/research-runs.repository.js';
import { MarketResearcherService } from './application/research-runs.service.js';
import { ResearchRunsController } from './presentation/research-runs.controller.js';

@Module({
  imports: [OpportunitiesModule],
  controllers: [ResearchRunsController],
  providers: [ResearchRunsRepository, MarketResearcherService],
  exports: [MarketResearcherService],
})
export class MarketResearcherModule {}
