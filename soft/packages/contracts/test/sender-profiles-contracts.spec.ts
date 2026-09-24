import { describe, it, expect } from 'vitest';
import {
  CreateSenderProfileSchema,
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
});
