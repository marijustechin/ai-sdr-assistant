import { describe, it, expect } from 'vitest';
import {
  assessPriceInquiryClarifications,
  buildPriceInquiryContent,
  buildSpecification,
  isPriceInquiryLocaleImplemented,
  resolvePriceInquiryLocale,
} from '../src/modules/price-inquiry/domain/content.js';
import type {
  ProductFactRecord,
  ProductRecord,
} from '../src/modules/products-and-offers/domain/types.js';

function fact(partial: Partial<ProductFactRecord>): ProductFactRecord {
  return {
    id: `${partial.key ?? 'f'}-id`,
    productId: 'p1',
    offerId: null,
    key: '',
    valueText: null,
    valueNumeric: null,
    unit: null,
    status: 'CONFIRMED',
    visibility: 'OPERATIONAL',
    sourceLabel: null,
    createdAt: new Date('2026-09-24T00:00:00.000Z'),
    updatedAt: new Date('2026-09-24T00:00:00.000Z'),
    ...partial,
  };
}

function product(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: 'p1',
    name: 'Thermo Abachi Cladding',
    scientificName: 'Triplochiton scleroxylon',
    description: null,
    category: 'Timber',
    lifecycleStatus: 'ACTIVE',
    outreachSenderProfileId: null,
    inquirySenderProfileId: null,
    createdAt: new Date('2026-09-24T00:00:00.000Z'),
    updatedAt: new Date('2026-09-24T00:00:00.000Z'),
    ...overrides,
  };
}

const BASE_INPUT = {
  locale: 'en',
  productName: 'Thermo Abachi Cladding',
  recipientName: null,
  senderName: 'Tomas Berg',
  senderTitle: 'Sourcing & Procurement',
  senderCompany: null,
};

describe('price inquiry content (short, human first contact)', () => {
  it('is concise and structured like a normal email', () => {
    const { body, subject } = buildPriceInquiryContent(BASE_INPUT);
    expect(subject).toContain('Thermo Abachi Cladding');
    expect(body).toMatch(/^Hello,/);
    expect(body).toContain(
      'I found Thermo Abachi Cladding on your website and would like to ask about the current price.',
    );
    expect(body).toContain('I look forward to your reply.');
    expect(body).toContain('Best regards,\nTomas Berg\nSourcing & Procurement');
    // A short first contact, not a long form.
    expect(body.length).toBeLessThan(700);
    expect(body.split('\n\n').length).toBeLessThanOrEqual(5);
  });

  it('has no numbered procurement checklist and no follow-up-only fields', () => {
    const { body } = buildPriceInquiryContent(BASE_INPUT);
    expect(body).not.toContain('Please quote:');
    expect(body).not.toMatch(/^\s*\d+\.\s/m);
    for (const phrase of [
      'incoterm',
      'lead time',
      'validity',
      'loading',
      'vat',
      'dispatch',
    ]) {
      expect(body.toLowerCase()).not.toContain(phrase);
    }
  });

  it('asks for the pricing unit when the price basis is unknown', () => {
    const { body } = buildPriceInquiryContent({
      ...BASE_INPUT,
      askPricingUnit: true,
      askMoq: false,
    });
    expect(body.toLowerCase()).toContain('the pricing unit');
    expect(body.toLowerCase()).not.toContain('minimum order quantity');
  });

  it('does not ask for the pricing unit when it is already known', () => {
    const { body } = buildPriceInquiryContent({
      ...BASE_INPUT,
      askPricingUnit: false,
      askMoq: true,
    });
    expect(body.toLowerCase()).not.toContain('pricing unit');
    expect(body.toLowerCase()).toContain('the minimum order quantity');
  });

  it('asks for the MOQ when appropriate and omits it when known', () => {
    const withMoq = buildPriceInquiryContent({
      ...BASE_INPUT,
      askPricingUnit: true,
      askMoq: true,
    }).body;
    expect(withMoq.toLowerCase()).toContain('the minimum order quantity');
    // Both topics joined into one short sentence.
    expect(withMoq).toContain(
      'let me know the pricing unit and the minimum order quantity.',
    );

    const noMoq = buildPriceInquiryContent({
      ...BASE_INPUT,
      askPricingUnit: true,
      askMoq: false,
    }).body;
    expect(noMoq.toLowerCase()).not.toContain('minimum order quantity');
  });

  it('omits the clarification sentence entirely when nothing is left to ask', () => {
    const { body } = buildPriceInquiryContent({
      ...BASE_INPUT,
      askPricingUnit: false,
      askMoq: false,
    });
    expect(body).not.toContain('If possible');
    expect(body).toContain('I look forward to your reply.');
  });

  it('never invents volume, urgency, destination, authority or a company', () => {
    const { body } = buildPriceInquiryContent(BASE_INPUT);
    for (const forbidden of [
      'urgent',
      'volume',
      'container',
      'destination',
      'authority',
      'purchase order',
      'our company',
      'we need',
      'asap',
    ]) {
      expect(body.toLowerCase()).not.toContain(forbidden);
    }
    // No company line when none is configured.
    expect(body).not.toMatch(/Sapiens Metric/);
  });

  it('uses the structured sender closing, each identity line at most once', () => {
    const { body } = buildPriceInquiryContent({
      ...BASE_INPUT,
      senderCompany: 'Sapiens Metric',
    });
    const occurrences = (needle: string) =>
      body.split(needle).length - 1;
    expect(occurrences('Tomas Berg')).toBe(1);
    expect(occurrences('Sourcing & Procurement')).toBe(1);
    expect(occurrences('Sapiens Metric')).toBe(1);
    const closing = body.split('Best regards,')[1] ?? '';
    expect(closing).toContain('Tomas Berg');
    expect(closing).toContain('Sourcing & Procurement');
    expect(closing).toContain('Sapiens Metric');
  });

  it('omits the company line when the sender has no company/brand', () => {
    const { body } = buildPriceInquiryContent(BASE_INPUT);
    const closing = body.split('Best regards,')[1] ?? '';
    expect(closing.trim().split('\n')).toEqual([
      'Tomas Berg',
      'Sourcing & Procurement',
    ]);
  });

  it('addresses a named recipient when provided', () => {
    const { body } = buildPriceInquiryContent({
      ...BASE_INPUT,
      recipientName: 'Jane Buyer',
    });
    expect(body).toMatch(/^Dear Jane Buyer,/);
  });

  it('does not label English text as an unimplemented locale', () => {
    expect(resolvePriceInquiryLocale('lt')).toBe('en');
    expect(isPriceInquiryLocaleImplemented('lt')).toBe(false);
    const content = buildPriceInquiryContent({ ...BASE_INPUT, locale: 'en' });
    expect(content.locale).toBe('en');
  });
});

describe('price inquiry clarifications (from persisted facts)', () => {
  it('asks for both when nothing is on record', () => {
    expect(assessPriceInquiryClarifications([])).toEqual({
      askPricingUnit: true,
      askMoq: true,
    });
  });

  it('does not ask for the pricing unit when a unit fact is on record', () => {
    expect(
      assessPriceInquiryClarifications([
        fact({ key: 'Price unit', valueText: 'm3' }),
      ]).askPricingUnit,
    ).toBe(false);
  });

  it('does not ask for the pricing unit when a price fact already carries a unit', () => {
    expect(
      assessPriceInquiryClarifications([
        fact({ key: 'Price', valueNumeric: 250, unit: 'm3' }),
      ]).askPricingUnit,
    ).toBe(false);
  });

  it('does not ask for the MOQ when an MOQ fact is on record', () => {
    expect(
      assessPriceInquiryClarifications([
        fact({ key: 'MOQ', valueText: '25 m3' }),
      ]).askMoq,
    ).toBe(false);
  });

  it('ignores PENDING and RESTRICTED facts', () => {
    expect(
      assessPriceInquiryClarifications([
        fact({ key: 'MOQ', valueText: '25 m3', status: 'PENDING' }),
        fact({ key: 'Price unit', valueText: 'm3', visibility: 'RESTRICTED' }),
      ]),
    ).toEqual({ askPricingUnit: true, askMoq: true });
  });
});

describe('specification grounding (kept for the draft summary)', () => {
  it('includes persisted product identity and confirmed operational facts only', () => {
    const { summary } = buildSpecification(product(), [
      fact({ key: 'Grade', valueText: 'A/B' }),
      fact({ key: 'Moq', valueText: 'PENDING-NOT-ALLOWED', status: 'PENDING' }),
      fact({
        key: 'CostBasis',
        valueText: 'RESTRICTED-NOT-ALLOWED',
        visibility: 'RESTRICTED',
      }),
    ]);
    expect(summary).toContain('Product: Thermo Abachi Cladding');
    expect(summary).toContain('Species / material: Triplochiton scleroxylon');
    expect(summary).toContain('Grade: A/B');
    expect(summary).not.toContain('PENDING-NOT-ALLOWED');
    expect(summary).not.toContain('RESTRICTED-NOT-ALLOWED');
  });
});
