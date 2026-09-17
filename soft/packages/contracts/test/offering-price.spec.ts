import { describe, it, expect } from 'vitest';
import { CreateOfferingSchema } from '../src/index.js';

const SOURCE_ID = '11111111-1111-4111-8111-111111111111';
const EVIDENCE_ID = '22222222-2222-4222-8222-222222222222';

describe('offering numeric price amount', () => {
  it('accepts an optional explicit numeric amount', () => {
    const base = {
      companyText: 'Merchant GmbH',
      sourceReferenceId: SOURCE_ID,
      evidenceId: EVIDENCE_ID,
    };
    expect(CreateOfferingSchema.safeParse(base).success).toBe(true);
    expect(
      CreateOfferingSchema.safeParse({ ...base, priceAmountNumeric: 2221.73 })
        .success,
    ).toBe(true);
  });

  it('rejects non-positive and non-finite amounts', () => {
    const base = {
      companyText: 'Merchant GmbH',
      sourceReferenceId: SOURCE_ID,
      evidenceId: EVIDENCE_ID,
    };
    expect(
      CreateOfferingSchema.safeParse({ ...base, priceAmountNumeric: 0 }).success,
    ).toBe(false);
    expect(
      CreateOfferingSchema.safeParse({ ...base, priceAmountNumeric: -1 }).success,
    ).toBe(false);
    expect(
      CreateOfferingSchema.safeParse({
        ...base,
        priceAmountNumeric: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
  });
});
