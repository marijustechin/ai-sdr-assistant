import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CreateEmailAccountInput,
  UpdateEmailAccountInput,
} from '@ai-sdr/contracts';
import {
  EncryptionNotConfiguredError,
  encryptSecret,
} from '../../../security/secret-box.js';
import type {
  EmailAccountRecord,
  UpdateEmailAccountData,
} from '../domain/types.js';
import { EmailAccountsRepository } from '../infrastructure/email-accounts.repository.js';

/**
 * Application service for `email-accounts`: the technical mailbox connection
 * owned by this module. It owns secret encryption for SMTP/IMAP passwords; the
 * plaintext is encrypted here and never stored, returned, logged, or rendered. An
 * account without credentials saves without the key.
 */
@Injectable()
export class EmailAccountsService {
  constructor(
    @Inject(EmailAccountsRepository)
    private readonly repository: EmailAccountsRepository,
  ) {}

  async create(input: CreateEmailAccountInput): Promise<EmailAccountRecord> {
    this.assertSharedConsistency(input.credentialsShared === true, {
      imapUsername: input.imapUsername ?? null,
      imapPasswordPresent: input.imapPassword !== undefined,
    });

    return this.repository.create({
      label: input.label,
      accountEmail: input.accountEmail,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.smtpHost !== undefined ? { smtpHost: input.smtpHost } : {}),
      ...(input.smtpPort !== undefined ? { smtpPort: input.smtpPort } : {}),
      ...(input.smtpTlsMode !== undefined
        ? { smtpTlsMode: input.smtpTlsMode }
        : {}),
      ...(input.smtpUsername !== undefined
        ? { smtpUsername: input.smtpUsername }
        : {}),
      ...(input.smtpPassword !== undefined
        ? { smtpPasswordCiphertext: this.encrypt(input.smtpPassword) }
        : {}),
      ...(input.imapHost !== undefined ? { imapHost: input.imapHost } : {}),
      ...(input.imapPort !== undefined ? { imapPort: input.imapPort } : {}),
      ...(input.imapTlsMode !== undefined
        ? { imapTlsMode: input.imapTlsMode }
        : {}),
      ...(input.imapUsername !== undefined
        ? { imapUsername: input.imapUsername }
        : {}),
      ...(input.imapPassword !== undefined
        ? { imapPasswordCiphertext: this.encrypt(input.imapPassword) }
        : {}),
      ...(input.credentialsShared !== undefined
        ? { credentialsShared: input.credentialsShared }
        : {}),
    });
  }

  async list(): Promise<EmailAccountRecord[]> {
    return this.repository.list();
  }

  async getAccount(id: string): Promise<EmailAccountRecord | null> {
    return this.repository.find(id);
  }

  async getAccountOrThrow(id: string): Promise<EmailAccountRecord> {
    const account = await this.repository.find(id);
    if (!account) {
      throw new NotFoundException({ error: 'email_account_not_found' });
    }
    return account;
  }

  async update(
    id: string,
    input: UpdateEmailAccountInput,
  ): Promise<EmailAccountRecord> {
    const existing = await this.repository.find(id);
    if (!existing) {
      throw new NotFoundException({ error: 'email_account_not_found' });
    }

    this.assertTransportComplete(existing, input);

    const shared = input.credentialsShared ?? existing.credentialsShared;
    this.assertSharedConsistency(shared, {
      imapUsername:
        input.imapUsername !== undefined
          ? input.imapUsername
          : existing.imapUsername,
      imapPasswordPresent:
        input.imapPassword !== undefined || existing.imapPasswordConfigured,
    });

    const data: UpdateEmailAccountData = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.accountEmail !== undefined) data.accountEmail = input.accountEmail;
    if (input.status !== undefined) data.status = input.status;
    if (input.provider !== undefined) data.provider = input.provider;
    if (input.smtpHost !== undefined) data.smtpHost = input.smtpHost;
    if (input.smtpPort !== undefined) data.smtpPort = input.smtpPort;
    if (input.smtpTlsMode !== undefined) data.smtpTlsMode = input.smtpTlsMode;
    if (input.smtpUsername !== undefined) data.smtpUsername = input.smtpUsername;
    if (input.imapHost !== undefined) data.imapHost = input.imapHost;
    if (input.imapPort !== undefined) data.imapPort = input.imapPort;
    if (input.imapTlsMode !== undefined) data.imapTlsMode = input.imapTlsMode;
    if (input.imapUsername !== undefined) data.imapUsername = input.imapUsername;

    // Passwords are write-only: omitted preserves, replacement/clearing explicit.
    if (input.smtpPassword !== undefined) {
      data.smtpPasswordCiphertext = this.encrypt(input.smtpPassword);
    } else if (input.clearSmtpPassword === true) {
      data.smtpPasswordCiphertext = null;
    }
    if (input.imapPassword !== undefined) {
      data.imapPasswordCiphertext = this.encrypt(input.imapPassword);
    } else if (input.clearImapPassword === true) {
      data.imapPasswordCiphertext = null;
    }

    if (input.credentialsShared !== undefined) {
      data.credentialsShared = input.credentialsShared;
    }

    // Sharing means IMAP reuses the SMTP credentials; drop any separate IMAP ones.
    if (shared && input.credentialsShared === true) {
      data.imapUsername = null;
      data.imapPasswordCiphertext = null;
    }

    return this.repository.update(id, data);
  }

  private encrypt(password: string): string {
    try {
      return encryptSecret(password);
    } catch (error) {
      if (error instanceof EncryptionNotConfiguredError) {
        throw new ServiceUnavailableException({
          error: 'secrets_key_not_configured',
        });
      }
      throw error;
    }
  }

  /** SMTP and IMAP host/port/TLS must each be set together (or all clear). */
  private assertTransportComplete(
    existing: EmailAccountRecord,
    input: UpdateEmailAccountInput,
  ): void {
    this.assertTriplet(
      'smtp',
      input.smtpHost !== undefined ? input.smtpHost : existing.smtpHost,
      input.smtpPort !== undefined ? input.smtpPort : existing.smtpPort,
      input.smtpTlsMode !== undefined
        ? input.smtpTlsMode
        : existing.smtpTlsMode,
    );
    this.assertTriplet(
      'imap',
      input.imapHost !== undefined ? input.imapHost : existing.imapHost,
      input.imapPort !== undefined ? input.imapPort : existing.imapPort,
      input.imapTlsMode !== undefined
        ? input.imapTlsMode
        : existing.imapTlsMode,
    );
  }

  private assertTriplet(
    kind: 'smtp' | 'imap',
    host: string | null,
    port: number | null,
    tls: string | null,
  ): void {
    const anySet = host !== null || port !== null || tls !== null;
    const allSet = host !== null && port !== null && tls !== null;
    if (anySet && !allSet) {
      throw new BadRequestException({
        error: 'invalid_email_account_configuration',
      });
    }
  }

  /** When shared, separate IMAP credentials must not be supplied/retained. */
  private assertSharedConsistency(
    shared: boolean,
    imap: { imapUsername: string | null; imapPasswordPresent: boolean },
  ): void {
    if (!shared) return;
    if (imap.imapUsername !== null || imap.imapPasswordPresent) {
      throw new BadRequestException({
        error: 'invalid_email_account_configuration',
      });
    }
  }
}
