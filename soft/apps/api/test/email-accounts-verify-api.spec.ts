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
const SYNTHETIC_KEY = Buffer.alloc(32, 7).toString('base64');
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

describe('Mailbox verification API (integration, no live connection)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.EMAIL_SECRETS_KEY = SYNTHETIC_KEY;
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env.EMAIL_SECRETS_KEY;
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

  it('refuses to verify a mailbox with no stored password (no connection attempted)', async () => {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Sourcing mailbox',
        accountEmail: 'mailbox@sapiensmetric.eu',
        smtpHost: 'mail.sapiensmetric.eu',
        smtpPort: 587,
        smtpTlsMode: 'STARTTLS',
        smtpUsername: 'mailbox@sapiensmetric.eu',
        imapHost: 'mail.sapiensmetric.eu',
        imapPort: 993,
        imapTlsMode: 'SSL_TLS',
        imapUsername: 'mailbox@sapiensmetric.eu',
      })
    ).json() as Json;

    const smtp = await api(
      'POST',
      `/email-accounts/${account.id as string}/verify-smtp`,
    );
    expect(smtp.statusCode).toBe(409);
    expect((smtp.json() as Json).error).toBe('mailbox_credentials_missing');

    const imap = await api(
      'POST',
      `/email-accounts/${account.id as string}/verify-imap`,
    );
    expect(imap.statusCode).toBe(409);
    expect((imap.json() as Json).error).toBe('mailbox_credentials_missing');
  });

  it('rejects verification when no transport is configured', async () => {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Bare',
        accountEmail: 'bare@example.invalid',
      })
    ).json() as Json;
    const res = await api(
      'POST',
      `/email-accounts/${account.id as string}/verify-smtp`,
    );
    expect(res.statusCode).toBe(400);
    expect((res.json() as Json).error).toBe('mailbox_not_configured');
  });

  it('404s for an unknown account and 400s for an unconfirmed test send', async () => {
    const missing = await api(
      'POST',
      `/email-accounts/${UNKNOWN_UUID}/verify-smtp`,
    );
    expect(missing.statusCode).toBe(404);

    const account = (
      await api('POST', '/email-accounts', {
        label: 'Sourcing mailbox',
        accountEmail: 'mailbox@sapiensmetric.eu',
        smtpHost: 'mail.sapiensmetric.eu',
        smtpPort: 587,
        smtpTlsMode: 'STARTTLS',
      })
    ).json() as Json;
    const unconfirmed = await api(
      'POST',
      `/email-accounts/${account.id as string}/test-send`,
      { to: 'someone@example.invalid' },
    );
    expect(unconfirmed.statusCode).toBe(400);
  });

  it('stores the mailbox password only as authenticated ciphertext', async () => {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Sourcing mailbox',
        accountEmail: 'mailbox@sapiensmetric.eu',
        smtpHost: 'mail.sapiensmetric.eu',
        smtpPort: 587,
        smtpTlsMode: 'STARTTLS',
        smtpUsername: 'mailbox@sapiensmetric.eu',
        smtpPassword: 'pw-1',
        imapHost: 'mail.sapiensmetric.eu',
        imapPort: 993,
        imapTlsMode: 'SSL_TLS',
        imapUsername: 'mailbox@sapiensmetric.eu',
        imapPassword: 'pw-2',
      })
    ).json() as Json;
    expect(account.smtpPasswordConfigured).toBe(true);
    const row = await prisma.db.emailAccount.findUniqueOrThrow({
      where: { id: account.id as string },
      select: {
        smtpPasswordCiphertext: true,
        imapPasswordCiphertext: true,
      },
    });
    expect(row.smtpPasswordCiphertext).toMatch(/^v1\./);
    expect(row.smtpPasswordCiphertext).not.toContain('pw-1');
    expect(row.imapPasswordCiphertext).toMatch(/^v1\./);
    expect(row.imapPasswordCiphertext).not.toContain('pw-2');
    expect(JSON.stringify(account)).not.toContain('Ciphertext');
  });
});
