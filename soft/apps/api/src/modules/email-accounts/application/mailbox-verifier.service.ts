import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { createTransport } from 'nodemailer';
import { ImapFlow } from 'imapflow';
import type {
  MailboxTestSendResponse,
  MailboxVerificationResponse,
} from '@ai-sdr/contracts';
import { decryptSecret } from '../../../security/secret-box.js';
import {
  buildImapClientOptions,
  buildSmtpTransportOptions,
  type MailboxCredential,
} from '../domain/mailbox-transport.js';
import {
  classifyImapConnectError,
  safeErrorCode,
  sampleFetchRange,
  type ImapFailureStage,
} from '../domain/imap-diagnostics.js';
import type { EmailAccountRecord } from '../domain/types.js';
import { EmailAccountsRepository } from '../infrastructure/email-accounts.repository.js';

/** Never ingest more than a handful of headers; access proof only. */
const IMAP_SAMPLE_LIMIT = 3;
/** Bounded connect/TLS probe ceiling. */
const CONNECT_PROBE_TIMEOUT_MS = 10_000;

const TEST_SUBJECT = 'AI SDR Assistant mailbox test';
const TEST_BODY =
  'This is a controlled connectivity test sent by the AI SDR Assistant admin ' +
  'mailbox verification. No campaign or outreach message was sent.';

/**
 * Bounded SMTP/IMAP verification paths for password-authenticated mailboxes.
 * These are the only places that open a real mailbox connection; they are
 * invoked explicitly by protected admin actions, never automatically, and never
 * ingest message content. The stored password is decrypted internally and is
 * never included in results, logs, or errors; failures report a stage and a
 * short safe code only.
 */
@Injectable()
export class MailboxVerifierService {
  constructor(
    @Inject(EmailAccountsRepository)
    private readonly repository: EmailAccountsRepository,
  ) {}

  /** Connects and authenticates to SMTP; sends nothing. */
  async verifySmtp(accountId: string): Promise<MailboxVerificationResponse> {
    const account = await this.getAccountOrThrow(accountId);
    // Credential/config problems surface as typed HTTP errors; only the actual
    // transport attempt is reduced to a redacted ok:false result.
    const credential = await this.credentialFor(account, 'smtp');
    try {
      const options = buildSmtpTransportOptions(account, credential);
      const transporter = createTransport(
        options as unknown as Parameters<typeof createTransport>[0],
      );
      try {
        await transporter.verify();
      } finally {
        transporter.close();
      }
      return {
        ok: true,
        detail: `SMTP authenticated (${options.host}:${options.port}, ${options.secure ? 'SSL/TLS' : 'STARTTLS'}).`,
      };
    } catch (error) {
      return this.failure('SMTP', error);
    }
  }

  /**
   * Connects and authenticates to IMAP; reads bounded header metadata only.
   * Reports the precise failing stage (tcp / tls / authentication / inbox_open /
   * header_fetch / timeout) with a short safe code. An empty mailbox succeeds.
   */
  async verifyImap(accountId: string): Promise<MailboxVerificationResponse> {
    const account = await this.getAccountOrThrow(accountId);
    if (!account.imapHost || account.imapPort == null) {
      throw new BadRequestException({ error: 'imap_not_configured' });
    }
    const credential = await this.credentialFor(account, 'imap');
    const options = buildImapClientOptions(account, credential);

    // Stage 1: distinguish TCP reachability from TLS negotiation.
    const probe = await this.probeTcpTls(options.host, options.port);
    if (probe.stage !== 'ok') {
      return this.imapFailure(probe.stage, probe.code ?? 'error');
    }

    // Stage 2: greeting + authentication (inside ImapFlow.connect()).
    let client: ImapFlow | null = null;
    try {
      client = new ImapFlow(
        options as unknown as ConstructorParameters<typeof ImapFlow>[0],
      );
      await client.connect();
    } catch (error) {
      const classified = classifyImapConnectError(error);
      if (client) {
        try {
          await client.logout();
        } catch {
          /* ignore close errors */
        }
      }
      return this.imapFailure(classified.stage, classified.code);
    }

    try {
      // Stage 3: open INBOX.
      let lock: Awaited<ReturnType<ImapFlow['getMailboxLock']>>;
      try {
        lock = await client.getMailboxLock('INBOX');
      } catch (error) {
        return this.imapFailure('inbox_open', safeErrorCode(error));
      }
      try {
        // Stage 4: bounded header fetch. An empty mailbox is a success.
        const mailbox = client.mailbox;
        const exists = mailbox ? mailbox.exists : 0;
        const range = sampleFetchRange(Math.min(exists, IMAP_SAMPLE_LIMIT));
        let examined = 0;
        if (range !== null) {
          try {
            for await (const message of client.fetch(range, {
              envelope: true,
              flags: true,
            })) {
              void message;
              examined += 1;
            }
          } catch (error) {
            return this.imapFailure('header_fetch', safeErrorCode(error));
          }
        }
        return {
          ok: true,
          detail: `IMAP authenticated; INBOX opened; examined ${examined} message header(s).`,
        };
      } finally {
        lock.release();
      }
    } finally {
      try {
        await client.logout();
      } catch {
        /* ignore close errors */
      }
    }
  }

  /** Sends exactly one controlled message to a single operator-supplied address. */
  async testSend(
    accountId: string,
    to: string,
  ): Promise<MailboxTestSendResponse> {
    const account = await this.getAccountOrThrow(accountId);
    const credential = await this.credentialFor(account, 'smtp');
    try {
      const options = buildSmtpTransportOptions(account, credential);
      const transporter = createTransport(
        options as unknown as Parameters<typeof createTransport>[0],
      );
      try {
        const info = await transporter.sendMail({
          from: account.accountEmail,
          to,
          subject: TEST_SUBJECT,
          text: TEST_BODY,
        });
        return {
          ok: true,
          detail: `Test message accepted by SMTP (${options.host}:${options.port}).`,
          messageId:
            typeof info.messageId === 'string' ? info.messageId : null,
        };
      } finally {
        transporter.close();
      }
    } catch (error) {
      const failed = this.failure('SMTP', error);
      return { ok: false, detail: failed.detail, messageId: null };
    }
  }

  /**
   * TCP reachability then TLS negotiation, each classified separately. Closes
   * the probe socket immediately; no data is exchanged.
   */
  private probeTcpTls(
    host: string,
    port: number,
  ): Promise<{ stage: 'ok' | ImapFailureStage; code?: string }> {
    return new Promise((resolve) => {
      let settled = false;
      let socket: ReturnType<typeof netConnect> | ReturnType<typeof tlsConnect> | null =
        null;
      const finish = (result: {
        stage: 'ok' | ImapFailureStage;
        code?: string;
      }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          socket?.destroy();
        } catch {
          /* ignore */
        }
        resolve(result);
      };
      const timer = setTimeout(
        () => finish({ stage: 'timeout', code: 'ETIMEOUT' }),
        CONNECT_PROBE_TIMEOUT_MS,
      );
      const tcp = netConnect({ host, port });
      socket = tcp;
      tcp.once('error', (error) =>
        finish({ stage: 'tcp', code: safeErrorCode(error) }),
      );
      tcp.once('connect', () => {
        const secured = tlsConnect({
          socket: tcp,
          servername: host,
          minVersion: 'TLSv1.2',
        });
        socket = secured;
        secured.once('secureConnect', () => finish({ stage: 'ok' }));
        secured.once('error', (error) =>
          finish({ stage: 'tls', code: safeErrorCode(error) }),
        );
      });
    });
  }

  private async credentialFor(
    account: EmailAccountRecord,
    kind: 'smtp' | 'imap',
  ): Promise<MailboxCredential> {
    const secrets = await this.repository.findPasswordCiphertexts(account.id);
    if (!secrets) {
      throw new NotFoundException({ error: 'email_account_not_found' });
    }
    const ciphertext =
      kind === 'smtp'
        ? secrets.smtpPasswordCiphertext
        : account.credentialsShared
          ? secrets.smtpPasswordCiphertext
          : secrets.imapPasswordCiphertext;
    if (!ciphertext) {
      throw new ConflictException({ error: 'mailbox_credentials_missing' });
    }
    const value = decryptSecret(ciphertext);
    return { password: value };
  }

  /** Redacted failure: a short machine code only, never a message or secret. */
  private failure(
    channel: 'SMTP' | 'IMAP',
    error: unknown,
  ): MailboxVerificationResponse {
    return this.imapFailureForChannel(channel, undefined, safeErrorCode(error));
  }

  /** IMAP failure with the precise stage, e.g. "failed at authentication (EAUTH)". */
  private imapFailure(
    stage: ImapFailureStage,
    code: string,
  ): MailboxVerificationResponse {
    return this.imapFailureForChannel('IMAP', stage, code);
  }

  private imapFailureForChannel(
    channel: 'SMTP' | 'IMAP',
    stage: ImapFailureStage | undefined,
    code: string,
  ): MailboxVerificationResponse {
    const at = stage ? ` at ${stage}` : '';
    return {
      ok: false,
      detail: `${channel} verification failed${at} (${code}).`,
    };
  }

  private async getAccountOrThrow(id: string): Promise<EmailAccountRecord> {
    const account = await this.repository.find(id);
    if (!account) {
      throw new NotFoundException({ error: 'email_account_not_found' });
    }
    if (!account.imapHost && !account.smtpHost) {
      throw new BadRequestException({ error: 'mailbox_not_configured' });
    }
    return account;
  }
}
