import { Module } from '@nestjs/common';
import { OpportunitiesRepository } from './infrastructure/opportunities.repository.js';
import { OpportunitiesService } from './application/opportunities.service.js';
import { TargetMarketsController } from './presentation/target-markets.controller.js';
import { OpportunitiesController } from './presentation/opportunities.controller.js';

@Module({
  controllers: [TargetMarketsController, OpportunitiesController],
  providers: [OpportunitiesRepository, OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
