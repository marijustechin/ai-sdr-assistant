import { Module } from '@nestjs/common';
import { PrismaService } from '@ai-sdr/database';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
