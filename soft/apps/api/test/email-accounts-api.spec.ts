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
/** Synthetic 32-byte key (base64) for the isolated test only. */
const SYNTHETIC_KEY = Buffer.alloc(32, 7).toString('base64');

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

describe('Email accounts API (integration)', () => {
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

  const base = {
    label: 'Acme Mail',
    accountEmail: 'mail@acme.invalid',
  };

  it('requires the internal key', async () => {
    const missing = await api('GET', '/email-accounts', undefined, null);
    expect(missing.statusCode).toBe(401);
  });

  it('creates an account without credentials and redacts reads', async () => {
    const res = await api('POST', '/email-accounts', base);
    expect(res.statusCode).toBe(201);
    const account = res.json() as Json;
    expect(account.smtpPasswordConfigured).toBe(false);
    expect(account.imapPasswordConfigured).toBe(false);
    expect(account.credentialsShared).toBe(false);
    expect(account).not.toHaveProperty('smtpPassword');
    expect(account).not.toHaveProperty('smtpPasswordCiphertext');
    expect(account).not.toHaveProperty('imapPasswordCiphertext');

    const list = (await api('GET', '/email-accounts')).json() as Array<Json>;
    expect(list).toHaveLength(1);
  });

  it('encrypts SMTP and IMAP passwords, preserves, replaces and clears explicitly', async () => {
    const created = (
      await api('POST', '/email-accounts', {
        ...base,
        smtpHost: 'smtp.acme.invalid',
        smtpPort: 587,
        smtpTlsMode: 'STARTTLS',
        smtpUsername: 'mail@acme.invalid',
        smtpPassword: 'synthetic-smtp-1',
        imapHost: 'imap.acme.invalid',
        imapPort: 993,
        imapTlsMode: 'SSL_TLS',
        imapUsername: 'mail@acme.invalid',
        imapPassword: 'synthetic-imap-1',
      })
    ).json() as Json;
    expect(created.smtpPasswordConfigured).toBe(true);
    expect(created.imapPasswordConfigured).toBe(true);

    const row = await prisma.db.emailAccount.findUniqueOrThrow({
      where: { id: created.id as string },
      select: {
        smtpPasswordCiphertext: true,
        imapPasswordCiphertext: true,
      },
    });
    expect(row.smtpPasswordCiphertext).toMatch(/^v1\./);
    expect(row.smtpPasswordCiphertext).not.toContain('synthetic-smtp-1');
    expect(row.imapPasswordCiphertext).toMatch(/^v1\./);
    expect(row.imapPasswordCiphertext).not.toContain('synthetic-imap-1');

    // Omitted passwords preserve the secrets.
    const renamed = (
      await api('PATCH', `/email-accounts/${created.id as string}`, {
        label: 'Acme Mail EU',
      })
    ).json() as Json;
    expect(renamed.smtpPasswordConfigured).toBe(true);
    expect(renamed.imapPasswordConfigured).toBe(true);

    // Replacement keeps them configured.
    const replaced = (
      await api('PATCH', `/email-accounts/${created.id as string}`, {
        smtpPassword: 'synthetic-smtp-2',
      })
    ).json() as Json;
    expect(replaced.smtpPasswordConfigured).toBe(true);

    // Explicit clears.
    const cleared = (
      await api('PATCH', `/email-accounts/${created.id as string}`, {
        clearSmtpPassword: true,
        clearImapPassword: true,
      })
    ).json() as Json;
    expect(cleared.smtpPasswordConfigured).toBe(false);
    expect(cleared.imapPasswordConfigured).toBe(false);
  });

  it('rejects separate IMAP credentials when sharing SMTP credentials', async () => {
    // Rejected by the contract on create.
    const shared = await api('POST', '/email-accounts', {
      ...base,
      credentialsShared: true,
      imapUsername: 'imap@acme.invalid',
    });
    expect(shared.statusCode).toBe(400);
    expect((shared.json() as Json).error).toBe('validation_failed');

    // Rejected by the service on update when stored IMAP credentials exist.
    const separate = (
      await api('POST', '/email-accounts', {
        ...base,
        imapHost: 'imap.acme.invalid',
        imapPort: 993,
        imapTlsMode: 'SSL_TLS',
        imapUsername: 'imap@acme.invalid',
        imapPassword: 'synthetic-imap',
      })
    ).json() as Json;
    const toShared = await api(
      'PATCH',
      `/email-accounts/${separate.id as string}`,
      { credentialsShared: true },
    );
    expect(toShared.statusCode).toBe(400);
    expect((toShared.json() as Json).error).toBe(
      'invalid_email_account_configuration',
    );
  });

  it('rejects incomplete SMTP or IMAP transport settings and unknown fields', async () => {
    const partialSmtp = await api('POST', '/email-accounts', {
      ...base,
      smtpHost: 'smtp.acme.invalid',
    });
    expect(partialSmtp.statusCode).toBe(400);

    const partialImap = await api('POST', '/email-accounts', {
      ...base,
      imapPort: 993,
    });
    expect(partialImap.statusCode).toBe(400);

    const unknown = await api('POST', '/email-accounts', {
      ...base,
      unexpected: true,
    });
    expect(unknown.statusCode).toBe(400);

    const missing = await api('GET', `/email-accounts/${UNKNOWN_UUID}`);
    expect(missing.statusCode).toBe(404);
  });

  it('fails credential saves clearly when the key is missing, without blocking credential-free accounts', async () => {
    const saved = process.env.EMAIL_SECRETS_KEY;
    delete process.env.EMAIL_SECRETS_KEY;
    try {
      const noCredentials = await api('POST', '/email-accounts', base);
      expect(noCredentials.statusCode).toBe(201);

      const withPassword = await api('POST', '/email-accounts', {
        ...base,
        label: 'With secret',
        smtpHost: 'smtp.acme.invalid',
        smtpPort: 465,
        smtpTlsMode: 'SSL_TLS',
        smtpUsername: 'mail@acme.invalid',
        smtpPassword: 'synthetic-password',
      });
      expect(withPassword.statusCode).toBe(503);
      expect((withPassword.json() as Json).error).toBe(
        'secrets_key_not_configured',
      );
    } finally {
      process.env.EMAIL_SECRETS_KEY = saved;
    }
  });
});
