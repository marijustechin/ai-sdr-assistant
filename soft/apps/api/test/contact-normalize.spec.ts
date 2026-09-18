import { describe, it, expect } from 'vitest';
import {
  contactDedupKey,
  normalizeEmail,
  normalizePageUrl,
  normalizePhone,
} from '../src/modules/contact-discovery/domain/normalize.js';

describe('contact normalization (comparison/dedup only)', () => {
  it('normalizes email without altering the address identity', () => {
    expect(normalizeEmail('  Info@Example.INVALID ')).toBe('info@example.invalid');
    // No dot-stripping or plus-handling: that would change who the address is.
    expect(normalizeEmail('first.last+tag@example.invalid')).toBe(
      'first.last+tag@example.invalid',
    );
  });

  it('strips separators from phone but never adds a country code', () => {
    expect(normalizePhone('+370 (600) 00-000')).toBe('+37060000' + '000');
    expect(normalizePhone('0600 00000')).toBe('060000000');
  });

  it('normalizes a page URL host and trailing slash, preserving the path', () => {
    expect(normalizePageUrl('HTTPS://Example.INVALID/Contact/')).toBe(
      'https://example.invalid/Contact',
    );
  });

  it('derives a deterministic identity key from company, type and channel', () => {
    const base = {
      companyId: 'company-1',
      contactType: 'GENERAL_COMPANY' as const,
      normalizedEmail: 'info@example.invalid',
      normalizedPhone: null,
      normalizedPageUrl: null,
    };
    const key = contactDedupKey(base);
    expect(contactDedupKey({ ...base })).toBe(key);
    expect(
      contactDedupKey({ ...base, contactType: 'NAMED_PERSON', personName: 'Jane' }),
    ).not.toBe(key);
    expect(
      contactDedupKey({ ...base, normalizedEmail: 'sales@example.invalid' }),
    ).not.toBe(key);
    expect(key).toHaveLength(64);
  });
});
