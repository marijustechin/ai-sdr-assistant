import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/load-env.js';
import { loadConfig } from './config/env.js';
import { logger } from './logging/logger.js';

loadEnv();

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ loggerInstance: logger }),
    { logger: false },
  );

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'API started');
}

void bootstrap();
