import { describe, it, expect } from 'vitest';
import {
  ContactDeliverabilitySchema,
  ContactTypeSchema,
  ContactUsabilitySchema,
  CreateContactSchema,
  UpdateContactSchema,
} from '../src/index.js';

const source = {
  url: 'https://example.invalid/contact',
  title: 'Contact us',
  retrievedAt: '2026-09-18T08:00:00.000Z',
  excerptText: 'General enquiries: info@example.invalid',
};

function generalContact(overrides: Record<string, unknown> = {}) {
  return {
    contactType: 'GENERAL_COMPANY',
    email: 'info@example.invalid',
    source,
    ...overrides,
  };
}

describe('contact contracts', () => {
  it('accepts a general company contact and a named-person contact', () => {
    expect(CreateContactSchema.safeParse(generalContact()).success).toBe(true);
    expect(
      CreateContactSchema.safeParse({
        contactType: 'NAMED_PERSON',
        personName: 'Jane Doe',
        personJobTitle: 'Purchasing Manager',
        phone: '+370 600 00000',
        source,
      }).success,
    ).toBe(true);
  });

  it('requires at least one contact channel', () => {
    expect(
      CreateContactSchema.safeParse({
        contactType: 'GENERAL_COMPANY',
        source,
      }).success,
    ).toBe(false);
  });

  it('requires a name for a named-person contact and forbids a title without one', () => {
    expect(
      CreateContactSchema.safeParse({
        contactType: 'NAMED_PERSON',
        email: 'jane@example.invalid',
        source,
      }).success,
    ).toBe(false);
    expect(
      CreateContactSchema.safeParse(
        generalContact({ personJobTitle: 'Purchasing Manager' }),
      ).success,
    ).toBe(false);
  });

  it('requires source provenance and rejects unknown fields', () => {
    expect(
      CreateContactSchema.safeParse({
        contactType: 'GENERAL_COMPANY',
        email: 'info@example.invalid',
      }).success,
    ).toBe(false);
    expect(
      CreateContactSchema.safeParse(
        generalContact({ guessedEmail: 'x@example.invalid' }),
      ).success,
    ).toBe(false);
    expect(
      CreateContactSchema.safeParse(
        generalContact({ email: 'not-an-email' }),
      ).success,
    ).toBe(false);
  });

  it('exposes the vocabularies and validates update actions', () => {
    expect(ContactTypeSchema.options).toEqual([
      'GENERAL_COMPANY',
      'NAMED_PERSON',
    ]);
    expect(ContactUsabilitySchema.options).toEqual(['USABLE', 'UNUSABLE']);
    expect(ContactDeliverabilitySchema.options).toEqual([
      'NOT_VERIFIED',
      'VERIFIED',
      'UNKNOWN',
    ]);
    expect(
      UpdateContactSchema.safeParse({
        usabilityStatus: 'UNUSABLE',
        unusableReason: 'Address bounced earlier.',
      }).success,
    ).toBe(true);
    expect(
      UpdateContactSchema.safeParse({ usabilityStatus: 'MAYBE' }).success,
    ).toBe(false);
    expect(
      UpdateContactSchema.safeParse({
        usabilityStatus: 'USABLE',
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
