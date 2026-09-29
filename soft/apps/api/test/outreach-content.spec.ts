import { describe, it, expect } from 'vitest';
import {
  buildDraftContent,
  composeOutreachBodies,
  hasScaffold,
  naturalizeObservation,
  shouldIncludeCategory,
} from '../src/modules/outreach-drafter/domain/content.js';

const base = {
  companyName: 'Example Sauna Reseller',
  observedActivityText: 'sells thermo-treated sauna cladding',
  offerSummary: 'Thermo Abachi STD cladding',
  productCategory: null as string | null,
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

const countOf = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

describe('observation naturalization (deterministic, evidence-safe)', () => {
  it('renders third-person commerce verbs as natural "you <verb>" clauses', () => {
    expect(naturalizeObservation('sells thermo-treated sauna cladding')).toBe(
      'you sell thermo-treated sauna cladding',
    );
    expect(naturalizeObservation('The company builds structures.')).toBe(
      'you build structures',
    );
    expect(naturalizeObservation('The company is a sauna materials reseller.')).toBe(
      'you are a sauna materials reseller',
    );
    expect(naturalizeObservation('works with thermo wood')).toBe(
      'you work with thermo wood',
    );
  });

  it('returns null for phrasing that cannot be rendered safely', () => {
    expect(naturalizeObservation('exterior/facade cladding')).toBeNull();
    expect(naturalizeObservation('   ')).toBeNull();
  });

  it('renders the bounded Lithuanian patterns (no machine translation)', () => {
    expect(
      naturalizeObservation('sells thermo-treated sauna cladding', 'lt'),
    ).toBe('prekiaujate thermo-treated sauna cladding');
    expect(naturalizeObservation('offers sauna materials', 'lt')).toBe(
      'siūlote sauna materials',
    );
    expect(naturalizeObservation('works with thermo wood', 'lt')).toBe(
      'dirbate su thermo wood',
    );
    expect(naturalizeObservation('builds timber structures', 'lt')).toBe(
      'statote timber structures',
    );
    expect(naturalizeObservation('manufactures cladding', 'lt')).toBe(
      'gaminate cladding',
    );
    expect(
      naturalizeObservation('The company is a sauna materials reseller.', 'lt'),
    ).toBe('esate sauna materials reseller');
  });

  it('keeps the safe neutral fallback for the Lithuanian market', () => {
    expect(naturalizeObservation('exterior/facade cladding', 'lt')).toBeNull();
    expect(naturalizeObservation('   ', 'lt')).toBeNull();
    // An unsupported language has no renderer and falls back safely.
    expect(naturalizeObservation('sells sauna cladding', 'lv')).toBeNull();
  });
});

describe('first-contact outreach content', () => {
  it('generates the closing phrase from the message language', () => {
    const en = buildDraftContent({ ...base, language: 'en' });
    expect(en.body).toContain('Best regards,');
    const lt = buildDraftContent({ ...base, language: 'lt' });
    expect(lt.body).toContain('Pagarbiai,');
    expect(hasScaffold('lt')).toBe(true);
    expect(hasScaffold('zz')).toBe(false);
  });

  it('personalizes with natural, evidence-backed prose (no raw fragment)', () => {
    const content = buildDraftContent({ ...base, language: 'en' });
    expect(content.canonicalBody).toContain(
      'I came across your company and noticed that you sell thermo-treated sauna cladding.',
    );
    // The raw DB fragment is not injected verbatim as its own fragment.
    expect(content.canonicalBody).not.toContain('— sells thermo-treated');
  });

  it('uses a neutral evidence-safe fallback when the observation cannot be rendered', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      observedActivityText: 'exterior/facade cladding',
    });
    expect(content.canonicalBody).toContain(
      'I came across your company and thought our products might be relevant.',
    );
    // Raw unrenderable phrasing never appears.
    expect(content.body).not.toContain('exterior/facade cladding');
  });

  it('renders Lithuanian evidence-backed personalization, not the generic fallback', () => {
    const content = buildDraftContent({
      ...base,
      language: 'lt',
      observedActivityText: 'sells thermo-treated sauna cladding',
    });
    expect(content.canonicalBody).toContain(
      'Radau jūsų įmonę ir pastebėjau, kad prekiaujate thermo-treated sauna cladding.',
    );
    expect(content.canonicalBody).not.toContain(
      'Radau jūsų įmonę ir norėčiau pasiteirauti',
    );
  });

  it('keeps the Lithuanian neutral fallback when the observation cannot be rendered', () => {
    const content = buildDraftContent({
      ...base,
      language: 'lt',
      observedActivityText: 'exterior/facade cladding',
    });
    expect(content.canonicalBody).toContain(
      'Radau jūsų įmonę ir norėčiau pasiteirauti dėl bendradarbiavimo.',
    );
    expect(content.body).not.toContain('exterior/facade cladding');
  });

  it('preserves official offer names and never leaks an internal category label into LT prose', () => {
    const lt = buildDraftContent({
      ...base,
      language: 'lt',
      offerSummary: 'Thermo Abachi STD cladding',
      productCategory: 'cladding',
    });
    // Official offer/product name is kept verbatim.
    expect(lt.canonicalBody).toContain('Thermo Abachi STD cladding');

    const ltWithCategoryOnly = buildDraftContent({
      ...base,
      language: 'lt',
      offerSummary: 'Thermo Abachi STD',
      productCategory: 'internal-english-category',
    });
    // The internal category label is not injected into Lithuanian prose.
    expect(ltWithCategoryOnly.canonicalBody).not.toContain(
      'internal-english-category',
    );
  });

  it('never invents recipient interest, intent or purchasing responsibility', () => {
    const content = buildDraftContent({ ...base, language: 'en' });
    for (const forbidden of [
      'you are looking for',
      "you're looking for",
      'you need a supplier',
      'your purchasing',
      'you buy',
      'interested in Abachi',
      'you are interested',
    ]) {
      expect(content.body.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('includes a category only when it adds information not already in the offer', () => {
    expect(shouldIncludeCategory('Thermo Abachi STD cladding', 'cladding')).toBe(
      false,
    );
    expect(shouldIncludeCategory('Thermo Abachi STD', 'cladding')).toBe(true);
    expect(shouldIncludeCategory('Thermo Abachi STD', null)).toBe(false);

    const duplicate = buildDraftContent({
      ...base,
      language: 'en',
      offerSummary: 'Thermo Abachi STD cladding',
      productCategory: 'cladding',
    });
    expect(duplicate.canonicalBody).not.toContain('(cladding)');

    const additive = buildDraftContent({
      ...base,
      language: 'en',
      offerSummary: 'Thermo Abachi STD',
      productCategory: 'cladding',
    });
    expect(additive.canonicalBody).toContain('Thermo Abachi STD (cladding)');
  });

  it('expresses personalization + proposition in one paragraph and terms + CTA in another', () => {
    const content = buildDraftContent({ ...base, language: 'en' });
    const paragraphs = content.canonicalBody.split('\n\n');
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[1]).toContain(
      'I came across your company and noticed that you sell thermo-treated sauna cladding.',
    );
    expect(paragraphs[1]).toContain('We supply Thermo Abachi STD cladding');
    expect(paragraphs[2]).toContain('competitive B2B terms');
    expect(paragraphs[2]).toContain('Would this be relevant for your product range?');
  });

  it('omits a concrete price by default and uses restrained terms wording', () => {
    const content = buildDraftContent({ ...base, language: 'en' });
    for (const money of ['€', '$', '£', 'EUR', 'USD', 'GBP']) {
      expect(content.body).not.toContain(money);
    }
    expect(content.body).not.toMatch(/\b\d+([.,]\d+)?\s*(eur|usd|gbp|\/m|per)\b/i);
    expect(content.body).toContain('competitive B2B terms');
    expect(content.body).toContain('quantity and specification');
  });

  it('does not use superlative or guarantee claims', () => {
    const content = buildDraftContent({ ...base, language: 'en' }).body.toLowerCase();
    for (const phrase of ['cheapest', 'best price', 'lowest price', 'guarantee', 'guaranteed']) {
      expect(content).not.toContain(phrase);
    }
  });

  it('uses exactly one simple CTA question, not a questionnaire', () => {
    const content = buildDraftContent({ ...base, language: 'en' });
    expect(countOf(content.body, '?')).toBe(1);
    expect(content.body).toContain('Would this be relevant for your product range?');
    for (const rfq of ['MOQ', 'Incoterm', 'lead time', 'validity', 'FOB', 'EXW', 'minimum order']) {
      expect(content.body).not.toContain(rfq);
    }
    const numbered = content.body
      .split('\n')
      .some((line) => /^\s*\d+[.)]\s/.test(line));
    expect(numbered).toBe(false);
  });

  it('keeps the canonical body free of the closing/signature (which are derived)', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      senderTitle: 'Sales Manager',
      senderCompany: 'Premium Timber Hub',
      senderPhone: '+370 600 00000',
      senderWebsite: 'premiumtimberhub.eu',
    });
    expect(content.canonicalBody).not.toContain('Best regards,');
    expect(content.canonicalBody).not.toContain('Jane Doe');
    // Derived plain-text body contains the structured closing/signature.
    expect(content.body).toContain('Best regards,');
    expect(content.body).toContain('Jane Doe');
    expect(content.body).toContain('Sales Manager');
    expect(content.body).toContain('Premium Timber Hub');
    expect(content.body).toContain('+370 600 00000');
    expect(content.body).toContain('premiumtimberhub.eu');
    expect(content.body).toContain('jane@acme.invalid');
    expect(content.body).not.toContain('Signature');
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

  it('keeps the logo off by default and only in HTML when enabled', () => {
    const off = buildDraftContent({
      ...base,
      language: 'en',
      logoUrl: 'https://acme.invalid/logo.png',
      includeLogoInSignature: false,
    });
    expect(off.htmlBody).not.toContain('<img');
    expect(off.body).not.toContain('<img');

    const on = buildDraftContent({
      ...base,
      language: 'en',
      logoUrl: 'https://acme.invalid/logo.png',
      includeLogoInSignature: true,
    });
    expect(on.htmlBody).toContain('<img src="https://acme.invalid/logo.png"');
    expect(on.body).not.toContain('<img');
    expect(on.body).not.toContain('logo.png');
  });

  it('is deterministic — the same inputs produce the identical snapshot', () => {
    const input = {
      ...base,
      language: 'en',
      senderPhone: '+370 600 00000',
      whatsappEnabled: true,
      includeLogoInSignature: true,
      logoUrl: 'https://acme.invalid/logo.png',
    };
    expect(buildDraftContent(input)).toEqual(buildDraftContent(input));
  });
});

describe('canonical body ↔ derived body/HTML consistency', () => {
  const identity = {
    senderName: 'Jane Doe',
    senderTitle: 'Sales Manager',
    senderCompany: 'Premium Timber Hub',
    senderPhone: '+370 600 00000',
    senderWebsite: 'premiumtimberhub.eu',
    senderEmail: 'jane@acme.invalid',
    whatsappEnabled: true,
    whatsappPhone: null,
    includeLogoInSignature: false,
    logoUrl: null,
  };

  it('regenerates both bodies from an edited canonical body', () => {
    const edited =
      'Hello team,\n\nWe noticed you supply sauna materials. We supply Thermo Abachi STD cladding.\n\nWould this be relevant?';
    const regenerated = composeOutreachBodies('en', edited, identity);
    expect(regenerated.body).toContain('Hello team,');
    expect(regenerated.body).toContain('Would this be relevant?');
    expect(regenerated.htmlBody).toContain('Hello team,');
    expect(regenerated.htmlBody).toContain('Would this be relevant?');
    // The derived bodies always carry the structured signature.
    expect(regenerated.body).toContain('Premium Timber Hub');
    expect(regenerated.htmlBody).toContain('Premium Timber Hub');

    // Re-composing with the ORIGINAL body yields a different HTML — i.e. an old
    // htmlBody can never remain paired with a new canonical body.
    const original = composeOutreachBodies('en', 'Original message.', identity);
    expect(regenerated.htmlBody).not.toBe(original.htmlBody);
    expect(regenerated.htmlBody).not.toContain('Original message.');
  });

  it('escapes HTML but keeps the plain text verbatim', () => {
    const edited = 'Hello <b>team</b>, 5 > 3 & counting.';
    const { body, htmlBody } = composeOutreachBodies('en', edited, identity);
    expect(body).toContain('Hello <b>team</b>, 5 > 3 & counting.');
    expect(htmlBody).toContain('Hello &lt;b&gt;team&lt;/b&gt;, 5 &gt; 3 &amp; counting.');
  });
});
