import { describe, it, expect } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module.js';

const DEV_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://ai_sdr:ai_sdr_dev@localhost:54329/ai_sdr?schema=public';
const UNREACHABLE_DATABASE_URL =
  'postgresql://ai_sdr:ai_sdr_dev@127.0.0.1:59999/ai_sdr?schema=public';

async function createApp(databaseUrl: string): Promise<NestFastifyApplication> {
  process.env.DATABASE_URL = databaseUrl;
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();
  return app;
}

describe('Readiness (integration against local PostgreSQL)', () => {
  it('GET /ready responds 200 when the database is available', async () => {
    const app = await createApp(DEV_DATABASE_URL);
    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ready' });
    } finally {
      await app.close();
    }
  });

  it('GET /ready responds a non-sensitive 503 when the database is unavailable', async () => {
    const app = await createApp(UNREACHABLE_DATABASE_URL);
    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'not_ready' });
      expect(response.body).not.toContain('postgresql://');
      expect(response.body).not.toContain('ai_sdr_dev');
      expect(response.body).not.toContain('ECONNREFUSED');
    } finally {
      await app.close();
    }
  });
});
