import { describe, it, expect } from 'vitest';
import {
  CreateSenderProfileSchema,
  isWhatsAppConfiguredValid,
  resolveWhatsAppPhone,
  SenderProfileResponseSchema,
  UpdateSenderProfileSchema,
} from '../src/index.js';

const identity = {
  label: 'Acme Sales',
  senderName: 'Jane Doe',
  companyName: 'Acme Timber',
  fromEmail: 'jane@acme.invalid',
};

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('sender profile contracts', () => {
  it('accepts a minimal profile (no company, title or mailbox) and one with extras', () => {
    expect(
      CreateSenderProfileSchema.safeParse({
        label: 'Minimal',
        senderName: 'Tomas Berg',
        fromEmail: 'tomas@example.invalid',
      }).success,
    ).toBe(true);
    expect(CreateSenderProfileSchema.safeParse(identity).success).toBe(true);
    expect(
      CreateSenderProfileSchema.safeParse({
        ...identity,
        senderTitle: 'Sourcing & Procurement',
        replyToEmail: 'sales@acme.invalid',
        signature: 'Jane Doe, Acme Timber',
        emailAccountId: ACCOUNT_ID,
      }).success,
    ).toBe(true);
  });

  it('rejects transport credentials on a sender profile', () => {
    expect(
      CreateSenderProfileSchema.safeParse({
        ...identity,
        smtpHost: 'smtp.acme.invalid',
      }).success,
    ).toBe(false);
    expect(
      UpdateSenderProfileSchema.safeParse({ smtpPassword: 'x' }).success,
    ).toBe(false);
  });

  it('allows clearing the mailbox reference on update', () => {
    expect(
      UpdateSenderProfileSchema.safeParse({ label: 'Renamed' }).success,
    ).toBe(true);
    expect(
      UpdateSenderProfileSchema.safeParse({ emailAccountId: ACCOUNT_ID }).success,
    ).toBe(true);
    expect(
      UpdateSenderProfileSchema.safeParse({ emailAccountId: null }).success,
    ).toBe(true);
  });

  it('exposes a nullable company/title and rejects a response that would carry a password', () => {
    expect(
      SenderProfileResponseSchema.safeParse({
        id: 'p1',
        label: 'x',
        senderName: 'x',
        senderTitle: null,
        companyName: null,
        fromEmail: 'x@y.invalid',
        replyToEmail: null,
        phone: null,
        website: null,
        whatsappEnabled: false,
        whatsappPhone: null,
        logoUrl: null,
        includeLogoInSignature: false,
        signature: null,
        status: 'ACTIVE',
        emailAccountId: ACCOUNT_ID,
        createdAt: '2026-09-22T00:00:00.000Z',
        updatedAt: '2026-09-22T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      SenderProfileResponseSchema.safeParse({
        id: 'p1',
        smtpPassword: 'leak',
      }).success,
    ).toBe(false);
  });

  it('accepts structured phone and website, and rejects an invalid website', () => {
    expect(
      CreateSenderProfileSchema.safeParse({
        ...identity,
        phone: '+370 600 00000',
        website: 'https://acme.invalid',
      }).success,
    ).toBe(true);
    expect(
      CreateSenderProfileSchema.safeParse({
        ...identity,
        website: 'not-a-url',
      }).success,
    ).toBe(false);
    expect(
      UpdateSenderProfileSchema.safeParse({ phone: null, website: null }).success,
    ).toBe(true);
  });

  it('accepts WhatsApp metadata and resolves the number with a main-phone fallback', () => {
    expect(
      CreateSenderProfileSchema.safeParse({
        ...identity,
        whatsappEnabled: true,
        whatsappPhone: '+370 600 00001',
      }).success,
    ).toBe(true);
    expect(
      UpdateSenderProfileSchema.safeParse({
        whatsappEnabled: true,
        whatsappPhone: null,
      }).success,
    ).toBe(true);
    expect(
      CreateSenderProfileSchema.safeParse({ whatsappEnabled: 'yes' }).success,
    ).toBe(false);

    // Fallback: dedicated number wins; else the main phone; else none.
    expect(resolveWhatsAppPhone('+370 600 00000', '+370 600 00001')).toBe(
      '+370 600 00001',
    );
    expect(resolveWhatsAppPhone('+370 600 00000', null)).toBe('+370 600 00000');
    expect(resolveWhatsAppPhone(null, null)).toBeNull();
  });

  it('requires a number when WhatsApp is enabled', () => {
    expect(
      isWhatsAppConfiguredValid({
        whatsappEnabled: false,
        phone: null,
        whatsappPhone: null,
      }),
    ).toBe(true);
    expect(
      isWhatsAppConfiguredValid({
        whatsappEnabled: true,
        phone: null,
        whatsappPhone: null,
      }),
    ).toBe(false);
    expect(
      isWhatsAppConfiguredValid({
        whatsappEnabled: true,
        phone: '+370 600 00000',
        whatsappPhone: null,
      }),
    ).toBe(true);
    expect(
      isWhatsAppConfiguredValid({
        whatsappEnabled: true,
        phone: null,
        whatsappPhone: '+370 600 00001',
      }),
    ).toBe(true);
  });

  it('accepts optional logo branding and rejects an invalid logo URL', () => {
    expect(
      CreateSenderProfileSchema.safeParse({
        ...identity,
        logoUrl: 'https://acme.invalid/logo.png',
        includeLogoInSignature: true,
      }).success,
    ).toBe(true);
    expect(
      CreateSenderProfileSchema.safeParse({ ...identity, logoUrl: 'nope' })
        .success,
    ).toBe(false);
    expect(
      UpdateSenderProfileSchema.safeParse({
        logoUrl: null,
        includeLogoInSignature: false,
      }).success,
    ).toBe(true);
  });
});
