import { describe, it, expect } from 'vitest';
import { buildDraftContent, hasScaffold } from '../src/modules/outreach-drafter/domain/content.js';

const base = {
  companyName: 'Example Builder',
  observedActivityText: 'Builds timber structures.',
  offerSummary: 'thermo-treated cladding',
  senderName: 'Jane Doe',
  senderTitle: null as string | null,
  senderCompany: null as string | null,
  senderPhone: null as string | null,
  senderWebsite: null as string | null,
  senderEmail: 'jane@acme.invalid',
  whatsappEnabled: false,
  whatsappPhone: null as string | null,
  includeLogoInSignature: false,
  logoUrl: null as string | null,
};

describe('outreach draft content', () => {
  it('generates the closing phrase from the message language', () => {
    const en = buildDraftContent({ ...base, language: 'en' });
    expect(en.body).toContain('Best regards,');
    const lt = buildDraftContent({ ...base, language: 'lt' });
    expect(lt.body).toContain('Pagarbiai,');
    expect(hasScaffold('lt')).toBe(true);
    expect(hasScaffold('zz')).toBe(false);
  });

  it('composes the signature from structured sender fields only', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderTitle: 'Sourcing & Procurement',
      senderCompany: 'Acme Timber',
      senderPhone: '+370 600 00000',
      senderWebsite: 'https://acme.invalid',
    });
    expect(content.body).toContain('Jane Doe');
    expect(content.body).toContain('Sourcing & Procurement');
    expect(content.body).toContain('Acme Timber');
    expect(content.body).toContain('+370 600 00000');
    expect(content.body).toContain('https://acme.invalid');
    expect(content.body).toContain('jane@acme.invalid');
  });

  it('omits an unset company and does not duplicate the sender name', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderCompany: 'Jane Doe',
    });
    const closing = content.body.split('Best regards,')[1] ?? '';
    expect(closing.match(/Jane Doe/g)?.length).toBe(1);
  });

  it('emits a canonical role/title verbatim (never translated)', () => {
    const title = 'Pardavimų vadovas';
    const content = buildDraftContent({
      ...base,
      language: 'lt',
      senderTitle: title,
    });
    expect(content.body).toContain(title);
  });

  it('does not read any free-text signature input', () => {
    // The builder accepts no signature field; a stored signature cannot leak in.
    const content = buildDraftContent({ ...base, language: 'en' });
    expect(content.body).not.toContain('Signature');
    expect(content.body).not.toContain('Best regards,\n\n');
  });

  it('appends WhatsApp to the main phone line when enabled (fallback)', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderPhone: '+370 600 00000',
      whatsappEnabled: true,
      whatsappPhone: null,
    });
    expect(content.body).toContain('+370 600 00000 · WhatsApp');
  });

  it('uses a separate WhatsApp number when provided and preserves both', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderPhone: '+370 600 00000',
      whatsappEnabled: true,
      whatsappPhone: '+370 600 00001',
    });
    expect(content.body).toContain('+370 600 00000');
    expect(content.body).toContain('+370 600 00001 · WhatsApp');
  });

  it('adds no WhatsApp marker when disabled', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderPhone: '+370 600 00000',
      whatsappEnabled: false,
      whatsappPhone: '+370 600 00001',
    });
    expect(content.body).toContain('+370 600 00000');
    expect(content.body).not.toContain('· WhatsApp');
  });

  it('defaults the logo off, so no image markup is generated', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      logoUrl: 'https://acme.invalid/logo.png',
      includeLogoInSignature: false,
    });
    expect(content.htmlBody).not.toContain('<img');
    expect(content.body).not.toContain('<img');
  });

  it('includes the logo in the HTML signature only when enabled', () => {
    const enabled = buildDraftContent({
      ...base,
      language: 'en',
      logoUrl: 'https://acme.invalid/logo.png',
      includeLogoInSignature: true,
    });
    expect(enabled.htmlBody).toContain('<img src="https://acme.invalid/logo.png"');
    // The plain-text body never contains the logo or image markup.
    expect(enabled.body).not.toContain('<img');
    expect(enabled.body).not.toContain('logo.png');
  });

  it('keeps structured contact details as text even when the logo is enabled', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderTitle: 'Sales Manager',
      senderCompany: 'Premium Timber Hub',
      senderPhone: '+370 600 00000',
      senderWebsite: 'premiumtimberhub.eu',
      logoUrl: 'https://acme.invalid/logo.png',
      includeLogoInSignature: true,
    });
    for (const value of [
      'Jane Doe',
      'Sales Manager',
      'Premium Timber Hub',
      '+370 600 00000',
      'premiumtimberhub.eu',
      'jane@acme.invalid',
    ]) {
      expect(content.htmlBody).toContain(value);
    }
  });

  it('omits the image when the logo is enabled but no URL is configured', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      includeLogoInSignature: true,
      logoUrl: null,
    });
    expect(content.htmlBody).not.toContain('<img');
    expect(content.htmlBody).toContain('jane@acme.invalid');
  });
});
