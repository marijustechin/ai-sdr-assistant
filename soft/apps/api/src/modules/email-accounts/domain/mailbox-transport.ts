import type { EmailTlsMode } from './types.js';

/**
 * Pure transport-option builders for password-authenticated SMTP and IMAP.
 * Deliberately free of I/O so the auth wiring (password, TLS mode, host/port)
 * can be unit-tested without opening a connection. Works with any provider that
 * uses conventional SMTP/IMAP settings (a hosted password mailbox under our own
 * domain).
 */

/** 20s ceiling; verification is always bounded. */
const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

export interface MailboxCredential {
  password: string;
}

export interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: { user: string; pass: string };
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  tls: { minVersion: 'TLSv1.2' };
}

export interface ImapClientOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  logger: false;
  tls: { minVersion: 'TLSv1.2' };
}

function isSecure(mode: EmailTlsMode | null): boolean {
  return mode === 'SSL_TLS';
}

export function buildSmtpTransportOptions(
  account: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpTlsMode: EmailTlsMode | null;
    smtpUsername: string | null;
    accountEmail: string;
  },
  credential: MailboxCredential,
): SmtpTransportOptions {
  if (account.smtpHost === null || account.smtpPort === null) {
    throw new Error('smtp_not_configured');
  }
  const user = account.smtpUsername ?? account.accountEmail;
  return {
    host: account.smtpHost,
    port: account.smtpPort,
    secure: isSecure(account.smtpTlsMode),
    requireTLS: account.smtpTlsMode === 'STARTTLS',
    auth: { user, pass: credential.password },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    tls: { minVersion: 'TLSv1.2' },
  };
}

export function buildImapClientOptions(
  account: {
    imapHost: string | null;
    imapPort: number | null;
    imapTlsMode: EmailTlsMode | null;
    imapUsername: string | null;
    smtpUsername: string | null;
    accountEmail: string;
  },
  credential: MailboxCredential,
): ImapClientOptions {
  if (account.imapHost === null || account.imapPort === null) {
    throw new Error('imap_not_configured');
  }
  const user =
    account.imapUsername ?? account.smtpUsername ?? account.accountEmail;
  return {
    host: account.imapHost,
    port: account.imapPort,
    secure: isSecure(account.imapTlsMode),
    auth: { user, pass: credential.password },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    logger: false,
    tls: { minVersion: 'TLSv1.2' },
  };
}
