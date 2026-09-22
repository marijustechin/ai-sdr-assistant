import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { DashboardService } from '../application/dashboard.service.js';

/**
 * Read-only admin dashboard summary. Guarded like every other business endpoint
 * (`x-internal-api-key`); it exposes aggregate counts only, never raw rows or
 * credentials.
 */
@Controller('dashboard')
@UseGuards(InternalApiKeyGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly service: DashboardService,
  ) {}

  @Get('summary')
  async summary() {
    return this.service.getSummary();
  }
}
