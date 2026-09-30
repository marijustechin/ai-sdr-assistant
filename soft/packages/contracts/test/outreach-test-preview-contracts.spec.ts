import { describe, it, expect } from 'vitest';
import {
  OUTREACH_TEST_RECIPIENT_ALLOWLIST,
  OutreachTestDeliveryStatusSchema,
  OutreachTestPreviewScopeSchema,
  SendOutreachTestPreviewSchema,
} from '../src/index.js';

const DRAFT_ID = '22222222-2222-4222-8222-222222222222';

describe('outreach send-test preview contracts', () => {
  it('pins the controlled test-recipient allowlist', () => {
    expect(OUTREACH_TEST_RECIPIENT_ALLOWLIST).toEqual([
      'm.smiginas@gmail.com',
      'info@alfasis.eu',
    ]);
  });

  it('accepts ALL and SELECTED scopes with explicit test recipients', () => {
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'ALL',
        testRecipients: ['m.smiginas@gmail.com'],
      }).success,
    ).toBe(true);
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'SELECTED',
        draftIds: [DRAFT_ID],
        testRecipients: ['info@alfasis.eu'],
        subjectPrefix: '[TEST]',
      }).success,
    ).toBe(true);
  });

  it('requires draftIds for SELECTED and rejects them for ALL', () => {
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'SELECTED',
        testRecipients: ['m.smiginas@gmail.com'],
      }).success,
    ).toBe(false);
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'SELECTED',
        draftIds: [],
        testRecipients: ['m.smiginas@gmail.com'],
      }).success,
    ).toBe(false);
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'ALL',
        draftIds: [DRAFT_ID],
        testRecipients: ['m.smiginas@gmail.com'],
      }).success,
    ).toBe(false);
  });

  it('requires at least one recipient and rejects unknown fields', () => {
    expect(
      SendOutreachTestPreviewSchema.safeParse({ scope: 'ALL', testRecipients: [] })
        .success,
    ).toBe(false);
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'ALL',
        testRecipients: ['m.smiginas@gmail.com'],
        to: 'real@example.invalid',
      }).success,
    ).toBe(false);
  });

  it('defaults to the real subject (prefix optional, blank rejected)', () => {
    const withoutPrefix = SendOutreachTestPreviewSchema.safeParse({
      scope: 'ALL',
      testRecipients: ['m.smiginas@gmail.com'],
    });
    expect(withoutPrefix.success).toBe(true);
    // A blank prefix is rejected so the real subject is preserved by default.
    expect(
      SendOutreachTestPreviewSchema.safeParse({
        scope: 'ALL',
        testRecipients: ['m.smiginas@gmail.com'],
        subjectPrefix: '',
      }).success,
    ).toBe(false);
  });

  it('exposes the scope and delivery-status vocabularies', () => {
    expect(OutreachTestPreviewScopeSchema.options).toEqual(['ALL', 'SELECTED']);
    expect(OutreachTestDeliveryStatusSchema.options).toEqual([
      'SENT',
      'FAILED',
    ]);
  });
});
