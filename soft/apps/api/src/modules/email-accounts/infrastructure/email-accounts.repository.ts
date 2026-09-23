import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type { EmailAccount } from '@ai-sdr/database';
import type {
  CreateEmailAccountData,
  EmailAccountRecord,
  UpdateEmailAccountData,
} from '../domain/types.js';

export function toEmailAccountRecord(account: EmailAccount): EmailAccountRecord {
  return {
    id: account.id,
    label: account.label,
    accountEmail: account.accountEmail,
    status: account.status,
    provider: account.provider,
    smtpHost: account.smtpHost,
    smtpPort: account.smtpPort,
    smtpTlsMode: account.smtpTlsMode,
    smtpUsername: account.smtpUsername,
    smtpPasswordConfigured: account.smtpPasswordCiphertext !== null,
    imapHost: account.imapHost,
    imapPort: account.imapPort,
    imapTlsMode: account.imapTlsMode,
    imapUsername: account.imapUsername,
    imapPasswordConfigured: account.imapPasswordCiphertext !== null,
    credentialsShared: account.credentialsShared,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

/**
 * Typed repository scoped to the table owned by `email-accounts`:
 * `email_accounts`. It never returns a ciphertext to callers.
 */
@Injectable()
export class EmailAccountsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateEmailAccountData): Promise<EmailAccountRecord> {
    const account = await this.prisma.db.emailAccount.create({
      data: {
        label: data.label,
        accountEmail: data.accountEmail,
        ...(data.status !== undefined ? { status: data.status } : {}),
        provider: data.provider ?? null,
        smtpHost: data.smtpHost ?? null,
        smtpPort: data.smtpPort ?? null,
        smtpTlsMode: data.smtpTlsMode ?? null,
        smtpUsername: data.smtpUsername ?? null,
        smtpPasswordCiphertext: data.smtpPasswordCiphertext ?? null,
        imapHost: data.imapHost ?? null,
        imapPort: data.imapPort ?? null,
        imapTlsMode: data.imapTlsMode ?? null,
        imapUsername: data.imapUsername ?? null,
        imapPasswordCiphertext: data.imapPasswordCiphertext ?? null,
        credentialsShared: data.credentialsShared ?? false,
      },
    });
    return toEmailAccountRecord(account);
  }

  async find(id: string): Promise<EmailAccountRecord | null> {
    const account = await this.prisma.db.emailAccount.findUnique({
      where: { id },
    });
    return account ? toEmailAccountRecord(account) : null;
  }

  async list(): Promise<EmailAccountRecord[]> {
    const accounts = await this.prisma.db.emailAccount.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return accounts.map(toEmailAccountRecord);
  }

  async update(
    id: string,
    data: UpdateEmailAccountData,
  ): Promise<EmailAccountRecord> {
    const update: Prisma.EmailAccountUpdateInput = {};
    if (data.label !== undefined) update.label = data.label;
    if (data.accountEmail !== undefined) update.accountEmail = data.accountEmail;
    if (data.status !== undefined) update.status = data.status;
    if (data.provider !== undefined) update.provider = data.provider;
    if (data.smtpHost !== undefined) update.smtpHost = data.smtpHost;
    if (data.smtpPort !== undefined) update.smtpPort = data.smtpPort;
    if (data.smtpTlsMode !== undefined) update.smtpTlsMode = data.smtpTlsMode;
    if (data.smtpUsername !== undefined) update.smtpUsername = data.smtpUsername;
    if (data.smtpPasswordCiphertext !== undefined) {
      update.smtpPasswordCiphertext = data.smtpPasswordCiphertext;
    }
    if (data.imapHost !== undefined) update.imapHost = data.imapHost;
    if (data.imapPort !== undefined) update.imapPort = data.imapPort;
    if (data.imapTlsMode !== undefined) update.imapTlsMode = data.imapTlsMode;
    if (data.imapUsername !== undefined) update.imapUsername = data.imapUsername;
    if (data.imapPasswordCiphertext !== undefined) {
      update.imapPasswordCiphertext = data.imapPasswordCiphertext;
    }
    if (data.credentialsShared !== undefined) {
      update.credentialsShared = data.credentialsShared;
    }
    const account = await this.prisma.db.emailAccount.update({
      where: { id },
      data: update,
    });
    return toEmailAccountRecord(account);
  }

  /**
   * Internal decrypt-only view of stored password ciphertexts for one account.
   * Never returned to a client; used by the bounded verifier only.
   */
  async findPasswordCiphertexts(id: string): Promise<{
    smtpPasswordCiphertext: string | null;
    imapPasswordCiphertext: string | null;
  } | null> {
    return this.prisma.db.emailAccount.findUnique({
      where: { id },
      select: {
        smtpPasswordCiphertext: true,
        imapPasswordCiphertext: true,
      },
    });
  }
}
