import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { PrismaService } from '@ai-sdr/database';

@Controller('ready')
export class ReadinessController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get()
  async ready(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ status: string }> {
    try {
      await this.prisma.checkReadiness();
      return { status: 'ready' };
    } catch {
      reply.status(503);
      return { status: 'not_ready' };
    }
  }
}
