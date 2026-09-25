import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';
const ID = '00000000-0000-4000-8000-000000000000';

async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();
  return app;
}

/**
 * Supplier price inquiry was decommissioned as a Market Research capability
 * (2026-09-25). Its endpoints are no longer registered; generic mailbox
 * infrastructure (email-accounts, sender-profiles, outreach) is unaffected.
 */
describe('Decommissioned supplier-inquiry endpoints (integration)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const gone = [
    ['POST', `/opportunities/${ID}/leads/${ID}/price-inquiry-drafts`],
    ['GET', `/opportunities/${ID}/leads/${ID}/price-inquiry-drafts`],
    ['POST', `/opportunities/${ID}/price-inquiry-drafts/${ID}/send`],
    ['POST', `/opportunities/${ID}/price-inquiry-drafts/${ID}/check-replies`],
    ['GET', `/opportunities/${ID}/quote-collection`],
    ['GET', `/opportunities/${ID}/quote-follow-ups`],
    ['POST', `/opportunities/${ID}/quote-follow-ups/run-due`],
    ['GET', `/opportunities/${ID}/research-runs/${ID}/result`],
    ['POST', `/opportunities/${ID}/research-runs/${ID}/finalize`],
  ] as const;

  for (const [method, url] of gone) {
    it(`${method} ${url} is not routable`, async () => {
      const res = await app.inject({
        method,
        url,
        headers: { 'x-internal-api-key': INTERNAL_KEY },
      });
      expect(res.statusCode).toBe(404);
    });
  }

  it('keeps the generic mailbox infrastructure reachable/unauthenticated-safe', async () => {
    // email-accounts is retained (generic SMTP/IMAP); with a valid key it is
    // routable (i.e. not 404), proving the app still boots the retained modules.
    const res = await app.inject({
      method: 'GET',
      url: '/email-accounts',
      headers: { 'x-internal-api-key': INTERNAL_KEY },
    });
    expect(res.statusCode).not.toBe(404);
  });
});
