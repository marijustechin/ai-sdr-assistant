import { describe, it, expect } from 'vitest';
import {
  OutreachPreparationStatusSchema,
  PrepareOutreachDraftSchema,
  ReviseOutreachDraftSchema,
} from '../src/index.js';

describe('outreach draft contracts', () => {
  it('accepts an empty request and supplied optional overrides', () => {
    expect(PrepareOutreachDraftSchema.safeParse({}).success).toBe(true);
    expect(
      PrepareOutreachDraftSchema.safeParse({
        offerSummary: 'Thermo-treated cladding',
        language: 'lt',
        contactId: '22222222-2222-4222-8222-222222222222',
      }).success,
    ).toBe(true);
  });

  it('rejects unknown fields and malformed values', () => {
    // The client cannot supply subject/body or a sender identity; those come
    // from context and the assigned sender profile.
    expect(
      PrepareOutreachDraftSchema.safeParse({ subject: 'x' }).success,
    ).toBe(false);
    expect(
      PrepareOutreachDraftSchema.safeParse({ senderName: 'Jane' }).success,
    ).toBe(false);
    expect(
      PrepareOutreachDraftSchema.safeParse({ contactId: 'not-a-uuid' }).success,
    ).toBe(false);
    expect(
      PrepareOutreachDraftSchema.safeParse({ language: 'e' }).success,
    ).toBe(false);
  });

  it('exposes the preparation-status vocabulary', () => {
    expect(OutreachPreparationStatusSchema.options).toEqual([
      'PREPARED',
      'BLOCKED',
    ]);
  });

  it('accepts a revision of the subject and/or canonical body only', () => {
    expect(
      ReviseOutreachDraftSchema.safeParse({ subject: 'New subject' }).success,
    ).toBe(true);
    expect(
      ReviseOutreachDraftSchema.safeParse({ canonicalBody: 'New body.' }).success,
    ).toBe(true);
    expect(
      ReviseOutreachDraftSchema.safeParse({
        subject: 'New subject',
        canonicalBody: 'New body.',
      }).success,
    ).toBe(true);
    // An empty body-object revision is rejected.
    expect(ReviseOutreachDraftSchema.safeParse({}).success).toBe(false);
  });

  it('never accepts derived body/htmlBody as independent revision fields', () => {
    expect(
      ReviseOutreachDraftSchema.safeParse({
        canonicalBody: 'Body.',
        body: 'raw plain text',
      }).success,
    ).toBe(false);
    expect(
      ReviseOutreachDraftSchema.safeParse({
        canonicalBody: 'Body.',
        htmlBody: '<p>Body.</p>',
      }).success,
    ).toBe(false);
  });
});
