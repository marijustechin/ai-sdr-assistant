import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface Json {
  [key: string]: unknown;
}

async function createApp(): Promise<NestFastifyApplication> {
  const newApp = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await newApp.init();
  return newApp;
}

describe('Sender profiles API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma.db);
  });

  async function api(
    method: 'POST' | 'GET' | 'PATCH',
    url: string,
    payload?: unknown,
    key: string | null = INTERNAL_KEY,
  ) {
    return app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: key === null ? {} : { 'x-internal-api-key': key },
    });
  }

  const identity = {
    label: 'Acme Sales',
    senderName: 'Jane Doe',
    companyName: 'Acme Timber',
    fromEmail: 'jane@acme.invalid',
  };

  it('requires the internal key', async () => {
    const missing = await api('GET', '/sender-profiles', undefined, null);
    expect(missing.statusCode).toBe(401);
  });

  it('creates an identity-only profile and lists it', async () => {
    const res = await api('POST', '/sender-profiles', identity);
    expect(res.statusCode).toBe(201);
    const profile = res.json() as Json;
    expect(profile).not.toHaveProperty('smtpPassword');
    expect(profile).not.toHaveProperty('smtpPasswordCiphertext');
    expect(profile.emailAccountId).toBeNull();

    const list = (await api('GET', '/sender-profiles')).json() as Array<Json>;
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(profile.id);
  });

  it('references a mailbox connection and rejects an unknown one', async () => {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Acme Mail',
        accountEmail: 'mail@acme.invalid',
      })
    ).json() as Json;

    const created = await api('POST', '/sender-profiles', {
      ...identity,
      emailAccountId: account.id,
    });
    expect(created.statusCode).toBe(201);
    expect((created.json() as Json).emailAccountId).toBe(account.id);

    const unknown = await api('POST', '/sender-profiles', {
      ...identity,
      label: 'Other',
      emailAccountId: UNKNOWN_UUID,
    });
    expect(unknown.statusCode).toBe(400);
    expect((unknown.json() as Json).error).toBe('email_account_not_found');
  });

  it('clears the mailbox connection reference explicitly', async () => {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Acme Mail',
        accountEmail: 'mail@acme.invalid',
      })
    ).json() as Json;
    const created = (
      await api('POST', '/sender-profiles', {
        ...identity,
        emailAccountId: account.id,
      })
    ).json() as Json;

    const cleared = await api(
      'PATCH',
      `/sender-profiles/${created.id as string}`,
      { emailAccountId: null },
    );
    expect(cleared.statusCode).toBe(200);
    expect((cleared.json() as Json).emailAccountId).toBeNull();
  });

  it('disables a profile and rejects unknown fields', async () => {
    const created = (
      await api('POST', '/sender-profiles', identity)
    ).json() as Json;
    const disabled = await api(
      'PATCH',
      `/sender-profiles/${created.id as string}`,
      { status: 'DISABLED' },
    );
    expect(disabled.statusCode).toBe(200);
    expect((disabled.json() as Json).status).toBe('DISABLED');

    const unknown = await api('POST', '/sender-profiles', {
      ...identity,
      unexpected: true,
    });
    expect(unknown.statusCode).toBe(400);

    const missing = await api('GET', `/sender-profiles/${UNKNOWN_UUID}`);
    expect(missing.statusCode).toBe(404);
  });

  it('assigns a profile to a product and clears it, without regression', async () => {
    const profile = (await api('POST', '/sender-profiles', identity)).json() as Json;
    const product = (
      await api('POST', '/products', { name: 'Cladding' })
    ).json() as Json;
    expect(product.senderProfileId).toBeNull();

    const assigned = await api(
      'PATCH',
      `/products/${product.id as string}`,
      { senderProfileId: profile.id },
    );
    expect(assigned.statusCode).toBe(200);
    expect((assigned.json() as Json).senderProfileId).toBe(profile.id);

    const read = (
      await api('GET', `/products/${product.id as string}`)
    ).json() as Json;
    expect(read.senderProfileId).toBe(profile.id);

    const cleared = await api(
      'PATCH',
      `/products/${product.id as string}`,
      { senderProfileId: null },
    );
    expect((cleared.json() as Json).senderProfileId).toBeNull();

    const unknownProfile = await api(
      'PATCH',
      `/products/${product.id as string}`,
      { senderProfileId: UNKNOWN_UUID },
    );
    expect(unknownProfile.statusCode).toBe(400);
    expect((unknownProfile.json() as Json).error).toBe(
      'sender_profile_not_found',
    );
  });
});
