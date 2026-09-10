import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { ReadinessController } from './health/readiness.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, ReadinessController],
})
export class AppModule {}
