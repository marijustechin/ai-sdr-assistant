import { describe, it, expect } from 'vitest';
import {
  buildDraftContent,
  composeOutreachBodies,
  hasScaffold,
  localizeOfferForLt,
  naturalizeObservation,
  renderLtObservation,
  shouldIncludeCategory,
} from '../src/modules/outreach-drafter/domain/content.js';

const base = {
  companyName: 'Example Sauna Reseller',
  recipientName: null as string | null,
  observedActivityText: 'sells thermo-treated sauna cladding',
  observedRoles: ['RETAILER'] as string[],
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

  it('supports only English observation naturalization (single-language rule)', () => {
    // Non-English messages must never be built by appending raw English tails.
    expect(naturalizeObservation('sells sauna cladding', 'lt')).toBeNull();
    expect(naturalizeObservation('sells sauna cladding', 'lv')).toBeNull();
  });
});

describe('Lithuanian personalization (structured, single-language)', () => {
  it('maps a sauna-cladding + bench-timber reseller to Lithuanian', () => {
    expect(
      renderLtObservation(
        ['RETAILER', 'DISTRIBUTOR'],
        'Sells sauna cladding and bench timber (alder/linden) from 18 EUR/m2.',
      ),
    ).toBe('prekiaujate pirties dailylentėmis ir gultų mediena');
  });

  it('maps a sauna installer, appending Lietuvoje', () => {
    expect(
      renderLtObservation(
        ['INSTALLER'],
        'Installs saunas across Lithuania (cladding, ventilation, heaters).',
      ),
    ).toBe('montuojate pirtis Lietuvoje');
  });

  it('maps a sauna manufacturer to Lithuanian', () => {
    expect(
      renderLtObservation(
        ['MANUFACTURER', 'DISTRIBUTOR'],
        'Manufactures outdoor panoramic barrel/Cube saunas in Lithuania; sells B2B to resellers/dealers; uses Nordic Spruce.',
      ),
    ).toBe('gaminate pirtis');
  });

  it('never leaks raw English evidence fragments into LT output', () => {
    const rendered = renderLtObservation(
      ['MANUFACTURER', 'DISTRIBUTOR'],
      'Manufactures outdoor panoramic barrel/Cube saunas in Lithuania; sells B2B to resellers/dealers; uses Nordic Spruce.',
    )!;
    for (const leak of [
      'outdoor',
      'panoramic',
      'barrel',
      'sells',
      'resellers',
      'dealers',
      'nordic',
      'spruce',
      'saunas',
      'cladding',
      'bench',
      'timber',
    ]) {
      expect(rendered.toLowerCase()).not.toMatch(new RegExp(`\\b${leak}\\b`));
    }
  });

  it('uses a neutral (null) fallback for an unmappable observation', () => {
    expect(renderLtObservation(['OTHER'], 'Operates in many sectors.')).toBeNull();
    // FABRICATOR + thermo wood: no safely-mappable generic category → fallback.
    expect(
      renderLtObservation(
        ['FABRICATOR'],
        'Thermal-modification service and made-to-order thermo wood for facades/sauna/hot tubs; B2B.',
      ),
    ).toBeNull();
    expect(renderLtObservation([], 'sells sauna cladding')).toBeNull();
  });

  it('renders LT product categories and never the English generic term', () => {
    const rendered = renderLtObservation(
      ['RETAILER'],
      'sells thermo-treated sauna cladding',
    )!;
    expect(rendered).toContain('dailylent');
    expect(rendered).not.toMatch(/\bcladding\b/i);
  });

  it('maps official names via bounded localization only (brand preserved)', () => {
    expect(localizeOfferForLt('Thermo Abachi Cladding')).toBe(
      'Thermo Abachi dailylentės',
    );
    expect(localizeOfferForLt('Thermo Abachi Supreme XL')).toBe(
      'Thermo Abachi Supreme XL',
    );
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
      'Radau jūsų įmonę ir pastebėjau, kad prekiaujate pirties dailylentėmis.',
    );
    expect(content.canonicalBody).not.toContain(
      'Radau jūsų įmonę ir norėčiau pasiteirauti',
    );
    // No raw English evidence fragment leaks into the LT message.
    expect(content.body).not.toContain('thermo-treated');
    expect(content.body).not.toMatch(/\bsauna\s+cladding\b/i);
  });

  it('keeps the Lithuanian neutral fallback when the observation cannot be rendered', () => {
    const content = buildDraftContent({
      ...base,
      language: 'lt',
      observedRoles: ['OTHER'],
      observedActivityText: 'Operates in many sectors.',
    });
    expect(content.canonicalBody).toContain(
      'Radau jūsų įmonę ir norėčiau pasiteirauti dėl bendradarbiavimo.',
    );
    expect(content.body).not.toContain('Operates in many sectors');
    expect(content.body).not.toContain('sectors');
  });

  it('preserves official names and localizes generic category terms in LT prose', () => {
    const lt = buildDraftContent({
      ...base,
      language: 'lt',
      offerSummary: 'Thermo Abachi STD cladding',
      productCategory: 'cladding',
    });
    // Brand/model kept verbatim; the generic "cladding" token is localized.
    expect(lt.canonicalBody).toContain('Thermo Abachi STD dailylentės');
    expect(lt.canonicalBody).not.toMatch(/\bcladding\b/i);

    const ltWithUnknownCategory = buildDraftContent({
      ...base,
      language: 'lt',
      offerSummary: 'Thermo Abachi STD',
      productCategory: 'internal-english-category',
    });
    // The internal category label is not injected into Lithuanian prose.
    expect(ltWithUnknownCategory.canonicalBody).not.toContain(
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

describe('subject and greeting rules', () => {
  it('uses a concise restrained English subject (no quick/short/question tactic)', () => {
    const content = buildDraftContent({
      ...base,
      language: 'en',
      offerSummary: 'Thermo Abachi',
      productCategory: 'cladding',
    });
    expect(content.subject).toBe('Thermo Abachi cladding');
    expect(content.subject.toLowerCase()).not.toContain('quick');
    expect(content.subject.toLowerCase()).not.toContain('question');
    expect(content.subject).not.toContain('?');
  });

  it('uses a natural Lithuanian subject with a localized category', () => {
    const content = buildDraftContent({
      ...base,
      language: 'lt',
      offerSummary: 'Thermo Abachi',
      productCategory: 'cladding',
    });
    expect(content.subject).toBe('Dėl Thermo Abachi dailylenčių');
    expect(content.subject).not.toContain('?');
    expect(content.subject).toContain('Thermo Abachi');
    expect(content.subject).not.toContain('Trumpas');
    expect(content.subject).not.toContain('klausimas');
  });

  it('omits an unknown LT category rather than leaking an English label', () => {
    const content = buildDraftContent({
      ...base,
      language: 'lt',
      offerSummary: 'Thermo Abachi',
      productCategory: 'internal-label',
    });
    expect(content.subject).toBe('Dėl Thermo Abachi');
    expect(content.subject).not.toContain('internal-label');
  });

  it('greets a real named contact person', () => {
    const en = buildDraftContent({
      ...base,
      language: 'en',
      recipientName: 'Jane Buyer',
    });
    expect(en.canonicalBody.split('\n')[0]).toBe('Hello Jane Buyer,');
    const lt = buildDraftContent({
      ...base,
      language: 'lt',
      recipientName: 'Jonas Pirkėjas',
    });
    expect(lt.canonicalBody.split('\n')[0]).toBe('Sveiki, Jonas Pirkėjas,');
  });

  it('uses a neutral greeting when only a company is known (no company-as-name, no team suffix)', () => {
    const en = buildDraftContent({
      ...base,
      language: 'en',
      recipientName: null,
    });
    expect(en.canonicalBody.split('\n')[0]).toBe('Hello,');
    expect(en.body).not.toContain('team');
    expect(en.body).not.toContain('Example Sauna Reseller team');

    const lt = buildDraftContent({
      ...base,
      language: 'lt',
      recipientName: null,
    });
    expect(lt.canonicalBody.split('\n')[0]).toBe('Sveiki,');
    expect(lt.body).not.toContain('Example Sauna Reseller');
  });
});

describe('LT first-contact fixtures (no unintended English prose)', () => {
  const fixtures: Array<{ roles: string[]; text: string }> = [
    {
      roles: ['RETAILER', 'DISTRIBUTOR'],
      text: 'Sells sauna cladding and bench timber (alder/linden) from 18 EUR/m2.',
    },
    {
      roles: ['INSTALLER'],
      text: 'Installs saunas across Lithuania (cladding, ventilation, heaters).',
    },
    {
      roles: ['MANUFACTURER', 'DISTRIBUTOR'],
      text: 'Manufactures outdoor panoramic barrel/Cube saunas in Lithuania; sells B2B to resellers/dealers; uses Nordic Spruce.',
    },
    {
      roles: ['DISTRIBUTOR', 'RETAILER'],
      text: 'Wholesale and retail sauna cladding (alder/linden/aspen).',
    },
    {
      roles: ['FABRICATOR', 'DISTRIBUTOR'],
      text: 'Thermal-modification service and made-to-order thermo wood for facades/sauna/hot tubs; B2B.',
    },
  ];
  const allowed = /Thermo Abachi|B2B|Jane Doe|jane@acme\.invalid/g;
  const englishLeaks = [
    'cladding',
    'sauna',
    'bench',
    'timber',
    'manufacture',
    'sells',
    'installs',
    'resellers',
    'dealers',
    'spruce',
    'nordic',
    'wholesale',
    'facades',
    'thermal',
    'hot tubs',
    'barrel',
  ];

  it('contains no unintended English evidence prose (only allowed proper/product names)', () => {
    for (const fixture of fixtures) {
      const content = buildDraftContent({
        ...base,
        language: 'lt',
        observedRoles: fixture.roles,
        observedActivityText: fixture.text,
        offerSummary: 'Thermo Abachi Cladding',
        productCategory: 'cladding',
      });
      const stripped = content.canonicalBody.replace(allowed, ' ').toLowerCase();
      for (const leak of englishLeaks) {
        expect(
          stripped,
          `${fixture.text} -> ${content.canonicalBody}`,
        ).not.toContain(leak);
      }
    }
  });

  it('keeps every LT personalization sentence fully Lithuanian', () => {
    for (const fixture of fixtures) {
      const content = buildDraftContent({
        ...base,
        language: 'lt',
        observedRoles: fixture.roles,
        observedActivityText: fixture.text,
      });
      const secondParagraph = content.canonicalBody.split('\n\n')[1]!;
      expect(secondParagraph).toMatch(
        /^Radau jūsų įmonę ir (pastebėjau, kad .+|norėčiau pasiteirauti dėl bendradarbiavimo\.)/,
      );
    }
  });
});
