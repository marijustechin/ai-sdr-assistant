import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  CreateProductFactSchema,
  CreateProductSchema,
  CreateOpportunitySchema,
  ResearchContextSchema,
} from '../src/index.js';

describe('write contracts', () => {
  it('accepts a valid Product and rejects unknown fields', () => {
    expect(CreateProductSchema.safeParse({ name: 'Abachi' }).success).toBe(true);
    expect(
      CreateProductSchema.safeParse({ name: 'Abachi', unexpected: true })
        .success,
    ).toBe(false);
    expect(CreateProductSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts exactly one fact subject and at least one value', () => {
    expect(
      CreateProductFactSchema.safeParse({
        productId: 'p1',
        key: 'origin',
        valueText: 'West Africa',
      }).success,
    ).toBe(true);
    expect(
      CreateProductFactSchema.safeParse({
        offerId: 'o1',
        key: 'thickness_mm',
        valueNumeric: 20,
      }).success,
    ).toBe(true);
  });

  it('rejects invalid fact subjects, missing values, SUPERSEDED and unlabeled CONFIRMED', () => {
    const invalid = [
      { key: 'k', valueText: 'v' },
      { productId: 'p', offerId: 'o', key: 'k', valueText: 'v' },
      { productId: 'p', key: 'k' },
      { productId: 'p', key: 'k', valueText: 'v', status: 'SUPERSEDED' },
      { productId: 'p', key: 'k', valueText: 'v', status: 'CONFIRMED' },
    ];
    for (const value of invalid) {
      expect(CreateProductFactSchema.safeParse(value).success).toBe(false);
    }
    expect(
      CreateProductFactSchema.safeParse({
        productId: 'p',
        key: 'k',
        valueText: 'v',
        status: 'CONFIRMED',
        sourceLabel: 'spec-sheet',
      }).success,
    ).toBe(true);
  });

  it('accepts a valid Opportunity and rejects unknown fields', () => {
    expect(
      CreateOpportunitySchema.safeParse({ offerId: 'o', name: 'Opp' }).success,
    ).toBe(true);
    expect(
      CreateOpportunitySchema.safeParse({
        offerId: 'o',
        name: 'Opp',
        extra: 1,
      }).success,
    ).toBe(false);
  });
});

const sampleContext = {
  schemaVersion: SCHEMA_VERSION,
  contextVersion: 3,
  frozenAt: '2026-09-10T10:00:00.000Z',
  scope: { targetMarketIds: ['m1'] },
  opportunity: {
    id: 'op1',
    name: 'Thermo Abachi cladding',
    objective: 'Enter the Baltic sauna market',
    status: 'ACTIVE',
  },
  product: { id: 'p1', name: 'Abachi', category: 'timber' },
  offer: {
    id: 'o1',
    name: 'Thermo Abachi STS 3D',
    deliveryTerms: [],
    certifications: [],
  },
  facts: {
    confirmed: [
      {
        id: 'f1',
        subject: 'PRODUCT',
        subjectId: 'p1',
        key: 'thickness_mm',
        status: 'CONFIRMED',
        version: 1,
        value: '20',
        sourceLabel: 'spec-sheet',
        confirmedAt: '2026-09-10T09:00:00.000Z',
        asOf: '2026-09-10T09:00:00.000Z',
        evidence: [],
      },
    ],
    pending: [
      {
        id: 'f2',
        subject: 'PRODUCT',
        subjectId: 'p1',
        key: 'origin',
        status: 'PENDING',
        version: 1,
        explanation: 'awaiting confirmation',
      },
    ],
    restricted: [],
  },
  unknowns: ['origin'],
  targetMarkets: [
    {
      id: 'm1',
      countries: ['LT'],
      industries: [],
      companyTypes: ['sauna manufacturers'],
      buyerTitles: [],
      requirements: [],
      exclusions: [],
    },
  ],
  priorResearchRuns: [],
  existingCompanies: [],
  approvedKnowledge: { buyerPersonas: [], valuePropositions: [] },
  humanDecisions: [],
};

describe('research context contract', () => {
  it('accepts a canonical research_context_v1 payload', () => {
    expect(ResearchContextSchema.safeParse(sampleContext).success).toBe(true);
  });

  it('rejects an unknown schema version', () => {
    expect(
      ResearchContextSchema.safeParse({
        ...sampleContext,
        schemaVersion: 'research_context_v2',
      }).success,
    ).toBe(false);
  });

  it('rejects a redacted fact that carries a value', () => {
    expect(
      ResearchContextSchema.safeParse({
        ...sampleContext,
        facts: {
          ...sampleContext.facts,
          pending: [{ ...sampleContext.facts.pending[0], value: 'leaked' }],
        },
      }).success,
    ).toBe(false);
  });
});
