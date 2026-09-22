import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type { SenderProfile } from '@ai-sdr/database';
import type {
  CreateSenderProfileData,
  SenderProfileRecord,
  UpdateSenderProfileData,
} from '../domain/types.js';

export function toSenderProfileRecord(
  profile: SenderProfile,
): SenderProfileRecord {
  return {
    id: profile.id,
    label: profile.label,
    senderName: profile.senderName,
    companyName: profile.companyName,
    fromEmail: profile.fromEmail,
    replyToEmail: profile.replyToEmail,
    signature: profile.signature,
    status: profile.status,
    emailAccountId: profile.emailAccountId,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Typed repository scoped to the table owned by `sender-profiles`:
 * `sender_profiles`. It holds identity only — no transport credentials.
 */
@Injectable()
export class SenderProfilesRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async create(data: CreateSenderProfileData): Promise<SenderProfileRecord> {
    const profile = await this.prisma.db.senderProfile.create({
      data: {
        label: data.label,
        senderName: data.senderName,
        companyName: data.companyName,
        fromEmail: data.fromEmail,
        replyToEmail: data.replyToEmail ?? null,
        signature: data.signature ?? null,
        ...(data.status !== undefined ? { status: data.status } : {}),
        emailAccountId: data.emailAccountId ?? null,
      },
    });
    return toSenderProfileRecord(profile);
  }

  async find(id: string): Promise<SenderProfileRecord | null> {
    const profile = await this.prisma.db.senderProfile.findUnique({
      where: { id },
    });
    return profile ? toSenderProfileRecord(profile) : null;
  }

  async list(): Promise<SenderProfileRecord[]> {
    const profiles = await this.prisma.db.senderProfile.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return profiles.map(toSenderProfileRecord);
  }

  async update(
    id: string,
    data: UpdateSenderProfileData,
  ): Promise<SenderProfileRecord> {
    const update: Prisma.SenderProfileUpdateInput = {};
    if (data.label !== undefined) update.label = data.label;
    if (data.senderName !== undefined) update.senderName = data.senderName;
    if (data.companyName !== undefined) update.companyName = data.companyName;
    if (data.fromEmail !== undefined) update.fromEmail = data.fromEmail;
    if (data.replyToEmail !== undefined) update.replyToEmail = data.replyToEmail;
    if (data.signature !== undefined) update.signature = data.signature;
    if (data.status !== undefined) update.status = data.status;
    if (data.emailAccountId !== undefined) {
      update.emailAccount =
        data.emailAccountId === null
          ? { disconnect: true }
          : { connect: { id: data.emailAccountId } };
    }
    const profile = await this.prisma.db.senderProfile.update({
      where: { id },
      data: update,
    });
    return toSenderProfileRecord(profile);
  }
}
