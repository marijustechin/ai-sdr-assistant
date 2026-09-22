import { describe, it, expect } from 'vitest';
import {
  CreateEmailAccountSchema,
  EmailAccountResponseSchema,
  UpdateEmailAccountSchema,
} from '../src/index.js';

const base = {
  label: 'Acme Mail',
  accountEmail: 'mail@acme.invalid',
};

describe('email account contracts', () => {
  it('accepts a credential-free account and a full SMTP+IMAP account', () => {
    expect(CreateEmailAccountSchema.safeParse(base).success).toBe(true);
    expect(
      CreateEmailAccountSchema.safeParse({
        ...base,
        provider: 'GENERIC',
        smtpHost: 'smtp.acme.invalid',
        smtpPort: 587,
        smtpTlsMode: 'STARTTLS',
        smtpUsername: 'mail@acme.invalid',
        smtpPassword: 'synthetic-smtp',
        imapHost: 'imap.acme.invalid',
        imapPort: 993,
        imapTlsMode: 'SSL_TLS',
        imapUsername: 'mail@acme.invalid',
        imapPassword: 'synthetic-imap',
      }).success,
    ).toBe(true);
  });

  it('requires SMTP and IMAP host/port/TLS together and a username with a password', () => {
    expect(
      CreateEmailAccountSchema.safeParse({ ...base, smtpHost: 'h' }).success,
    ).toBe(false);
    expect(
      CreateEmailAccountSchema.safeParse({ ...base, imapPort: 993 }).success,
    ).toBe(false);
    expect(
      CreateEmailAccountSchema.safeParse({
        ...base,
        imapHost: 'h',
        imapPort: 993,
        imapTlsMode: 'SSL_TLS',
        imapPassword: 'x',
      }).success,
    ).toBe(false);
  });

  it('rejects separate IMAP credentials when shared with SMTP', () => {
    expect(
      CreateEmailAccountSchema.safeParse({
        ...base,
        credentialsShared: true,
        imapUsername: 'imap@acme.invalid',
      }).success,
    ).toBe(false);
  });

  it('treats passwords as write-only on update (replace or clear explicitly)', () => {
    expect(
      UpdateEmailAccountSchema.safeParse({ smtpPassword: 'new' }).success,
    ).toBe(true);
    expect(
      UpdateEmailAccountSchema.safeParse({ clearImapPassword: true }).success,
    ).toBe(true);
    expect(
      UpdateEmailAccountSchema.safeParse({
        smtpPassword: 'x',
        clearSmtpPassword: true,
      }).success,
    ).toBe(false);
    expect(
      UpdateEmailAccountSchema.safeParse({
        imapPassword: 'x',
        clearImapPassword: true,
      }).success,
    ).toBe(false);
  });

  it('rejects a response that would carry a password', () => {
    expect(
      EmailAccountResponseSchema.safeParse({
        id: 'a1',
        label: 'x',
        accountEmail: 'x@y.invalid',
        status: 'ACTIVE',
        authKind: 'PASSWORD',
        provider: null,
        smtpHost: null,
        smtpPort: null,
        smtpTlsMode: null,
        smtpUsername: null,
        smtpPasswordConfigured: false,
        imapHost: null,
        imapPort: null,
        imapTlsMode: null,
        imapUsername: null,
        imapPasswordConfigured: false,
        credentialsShared: false,
        createdAt: '2026-09-22T00:00:00.000Z',
        updatedAt: '2026-09-22T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      EmailAccountResponseSchema.safeParse({
        id: 'a1',
        smtpPassword: 'leak',
      }).success,
    ).toBe(false);
  });
});
