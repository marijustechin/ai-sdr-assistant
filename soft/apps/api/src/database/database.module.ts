import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@ai-sdr/database';

/**
 * Provides the single, shared `PrismaService` (lazy Prisma client boundary) to
 * every feature module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
