import { describe, it, expect } from 'vitest';
import {
  extractQuote,
  stripQuotedOriginal,
} from '../src/modules/quote-collection/domain/quote-extraction.js';

describe('quote extraction (evidence-grounded, conservative)', () => {
  it('extracts the stated commercial terms with provenance', () => {
    const result = extractQuote(
      'Our price is 1200 EUR per m3, MOQ 20 m3, FOB Rotterdam. ' +
        'Lead time: 3 weeks. Offer valid until 31 October. Prices exclude VAT. ' +
        'We can offer a substitute grade if needed.',
    );
    expect(result.priceText).toContain('1200 EUR');
    expect(result.priceAmount).toBe(1200);
    expect(result.currency).toBe('EUR');
    expect(result.priceUnit).toBe('m3');
    expect(result.moqText).toContain('20 m3');
    expect(result.incoterm).toBe('FOB');
    expect(result.leadTimeText).toContain('3 weeks');
    expect(result.validityText).toBeTruthy();
    expect(result.vatIncluded).toBe(false);
    expect(result.qualificationText).toMatch(/substitute/i);
    expect(result.warnings).not.toContain('price_not_found');
    // Every populated field carries a supporting excerpt.
    for (const [field, value] of Object.entries(result.fieldProvenance)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(Object.keys(result)).toContain(field);
    }
  });

  it('leaves missing values null and records warnings', () => {
    const result = extractQuote('Hi, we will get back to you shortly.');
    expect(result.priceText).toBeNull();
    expect(result.priceAmount).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.priceUnit).toBeNull();
    expect(result.moqText).toBeNull();
    expect(result.incoterm).toBeNull();
    expect(result.vatIncluded).toBeNull();
    expect(result.warnings).toContain('price_not_found');
    expect(result.warnings).toContain('unit_not_stated');
  });

  it('does not invent a price when several distinct prices are quoted', () => {
    const result = extractQuote('Unit price 100 EUR for small, 200 EUR for bulk.');
    expect(result.priceText).toBeNull();
    expect(result.priceAmount).toBeNull();
    expect(result.warnings).toContain('multiple_prices_found');
  });

  it('does not guess a thousands separator to force an amount', () => {
    const result = extractQuote('Price: €1.200 per roll.');
    expect(result.priceText).toContain('1.200');
    expect(result.priceAmount).toBeNull();
    expect(result.warnings).toContain('price_amount_ambiguous');
    expect(result.priceUnit).toBe('roll');
  });

  it('recognises an inclusive VAT statement', () => {
    const result = extractQuote('All prices are VAT included, 250 GBP per pallet.');
    expect(result.vatIncluded).toBe(true);
    expect(result.currency).toBe('GBP');
    expect(result.priceUnit).toBe('pallet');
    expect(result.incoterm).toBeNull();
  });

  it('does not treat our own quoted original inquiry as supplier evidence', () => {
    const reply = [
      'Deja šio produkto nebepalaikome ir kainos nepateiksime.',
      '',
      'From: info@consolva.lt <info@consolva.lt>',
      'Sent: Thursday, 24 September 2026',
      'Subject: FW: Dėl termo ayous (abachi) dailylentės kainos',
      '',
      '-----Original message-----',
      'Mūsų užklausa: prašome nurodyti kainą 999 EUR už m3, MOQ 500 m3, FOB.',
    ].join('\n');
    expect(stripQuotedOriginal(reply)).not.toContain('999');
    expect(stripQuotedOriginal(reply)).not.toContain('FOB');
    const result = extractQuote(reply);
    expect(result.priceAmount).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.moqText).toBeNull();
    expect(result.incoterm).toBeNull();
  });

  it('strips > quoted blocks and keeps the supplier-authored price', () => {
    const reply = [
      'Kaina 45 EUR už m2, MOQ 50 m2.',
      '',
      '> Turime omenyje, kad Jūsų pradinė kaina buvo 999 EUR m3.',
    ].join('\n');
    const result = extractQuote(reply);
    expect(result.priceAmount).toBe(45);
    expect(result.currency).toBe('EUR');
    expect(result.priceUnit).toBe('m2');
  });
});
