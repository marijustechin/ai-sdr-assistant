import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateSenderProfileInput,
  UpdateSenderProfileInput,
} from '@ai-sdr/contracts';
import { EmailAccountsService } from '../../email-accounts/application/email-accounts.service.js';
import type {
  SenderProfileRecord,
  UpdateSenderProfileData,
} from '../domain/types.js';
import { SenderProfilesRepository } from '../infrastructure/sender-profiles.repository.js';

/**
 * Application service for `sender-profiles`: reusable, product-independent
 * sender identities. A profile carries no transport credentials — it may only
 * reference a mailbox connection owned by `email-accounts`.
 */
@Injectable()
export class SenderProfilesService {
  constructor(
    @Inject(SenderProfilesRepository)
    private readonly repository: SenderProfilesRepository,
    @Inject(EmailAccountsService)
    private readonly emailAccounts: EmailAccountsService,
  ) {}

  async create(input: CreateSenderProfileInput): Promise<SenderProfileRecord> {
    if (input.emailAccountId !== undefined) {
      await this.assertAccountExists(input.emailAccountId);
    }
    return this.repository.create({
      label: input.label,
      senderName: input.senderName,
      companyName: input.companyName,
      fromEmail: input.fromEmail,
      ...(input.replyToEmail !== undefined
        ? { replyToEmail: input.replyToEmail }
        : {}),
      ...(input.signature !== undefined ? { signature: input.signature } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.emailAccountId !== undefined
        ? { emailAccountId: input.emailAccountId }
        : {}),
    });
  }

  async list(): Promise<SenderProfileRecord[]> {
    return this.repository.list();
  }

  async getProfile(id: string): Promise<SenderProfileRecord | null> {
    return this.repository.find(id);
  }

  async getProfileOrThrow(id: string): Promise<SenderProfileRecord> {
    const profile = await this.repository.find(id);
    if (!profile) {
      throw new NotFoundException({ error: 'sender_profile_not_found' });
    }
    return profile;
  }

  async update(
    id: string,
    input: UpdateSenderProfileInput,
  ): Promise<SenderProfileRecord> {
    const existing = await this.repository.find(id);
    if (!existing) {
      throw new NotFoundException({ error: 'sender_profile_not_found' });
    }

    if (input.emailAccountId !== undefined && input.emailAccountId !== null) {
      await this.assertAccountExists(input.emailAccountId);
    }

    const data: UpdateSenderProfileData = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.senderName !== undefined) data.senderName = input.senderName;
    if (input.companyName !== undefined) data.companyName = input.companyName;
    if (input.fromEmail !== undefined) data.fromEmail = input.fromEmail;
    if (input.replyToEmail !== undefined) data.replyToEmail = input.replyToEmail;
    if (input.signature !== undefined) data.signature = input.signature;
    if (input.status !== undefined) data.status = input.status;
    if (input.emailAccountId !== undefined) {
      data.emailAccountId = input.emailAccountId;
    }

    return this.repository.update(id, data);
  }

  /** A referenced mailbox connection must exist (no silent dangling reference). */
  private async assertAccountExists(accountId: string): Promise<void> {
    const account = await this.emailAccounts.getAccount(accountId);
    if (!account) {
      throw new BadRequestException({ error: 'email_account_not_found' });
    }
  }
}
