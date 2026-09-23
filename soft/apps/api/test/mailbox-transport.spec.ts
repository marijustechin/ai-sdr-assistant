import { describe, it, expect } from 'vitest';
import {
  buildImapClientOptions,
  buildSmtpTransportOptions,
} from '../src/modules/email-accounts/domain/mailbox-transport.js';

/** Conventional hosted-mailbox settings (human confirms the exact values). */
const account = {
  accountEmail: 'mailbox@sapiensmetric.eu',
  smtpHost: 'mail.sapiensmetric.eu',
  smtpPort: 587,
  smtpTlsMode: 'STARTTLS' as const,
  smtpUsername: 'mailbox@sapiensmetric.eu',
  imapHost: 'mail.sapiensmetric.eu',
  imapPort: 993,
  imapTlsMode: 'SSL_TLS' as const,
  imapUsername: 'mailbox@sapiensmetric.eu',
};

const credential = { password: 'pw-1' };

describe('password SMTP/IMAP transport wiring', () => {
  it('wires SMTP STARTTLS (587) with the mailbox password', () => {
    const options = buildSmtpTransportOptions(account, credential);
    expect(options).toMatchObject({
      host: 'mail.sapiensmetric.eu',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'mailbox@sapiensmetric.eu', pass: 'pw-1' },
    });
  });

  it('wires SMTP implicit TLS (465) when selected', () => {
    const options = buildSmtpTransportOptions(
      { ...account, smtpPort: 465, smtpTlsMode: 'SSL_TLS' },
      credential,
    );
    expect(options).toMatchObject({
      port: 465,
      secure: true,
      requireTLS: false,
    });
  });

  it('wires IMAP SSL/TLS (993) with the mailbox password', () => {
    const options = buildImapClientOptions(account, credential);
    expect(options).toMatchObject({
      host: 'mail.sapiensmetric.eu',
      port: 993,
      secure: true,
      auth: { user: 'mailbox@sapiensmetric.eu', pass: 'pw-1' },
    });
  });

  it('falls back to the account email when no username is set', () => {
    const options = buildImapClientOptions(
      { ...account, imapUsername: null, smtpUsername: null },
      credential,
    );
    expect(options.auth.user).toBe('mailbox@sapiensmetric.eu');
  });

  it('bounds the connection and rejects an unconfigured transport', () => {
    const options = buildSmtpTransportOptions(account, credential);
    expect(options.connectionTimeout).toBeLessThanOrEqual(15_000);
    expect(options.socketTimeout).toBeLessThanOrEqual(30_000);
    expect(() =>
      buildSmtpTransportOptions(
        { ...account, smtpHost: null },
        credential,
      ),
    ).toThrow('smtp_not_configured');
    expect(() =>
      buildImapClientOptions(
        { ...account, imapPort: null },
        credential,
      ),
    ).toThrow('imap_not_configured');
  });
});
