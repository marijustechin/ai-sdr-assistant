import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  CorrectClaimSchema,
  CreateProductFactSchema,
  CreateProductSchema,
  CreateOpportunitySchema,
  CreateResearchRunSchema,
  PersistClaimSchema,
  PersistEvidenceSchema,
  ProductResponseSchema,
  RecordResearchQuerySchema,
  RegisterSourceSchema,
  ResearchContextSchema,
  UpdateProductSchema,
  UpdateResearchRunSchema,
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

describe('product read and update contracts', () => {
  const sampleResponse = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Thermo Abachi',
    scientificName: null,
    description: 'Heat-treated.',
    category: 'hardwood timber',
    lifecycleStatus: 'ACTIVE',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z',
  };

  it('accepts a valid product response and rejects unknown fields', () => {
    expect(ProductResponseSchema.safeParse(sampleResponse).success).toBe(true);
    expect(
      ProductResponseSchema.safeParse({ ...sampleResponse, extra: 1 }).success,
    ).toBe(false);
  });

  it('rejects an unsupported lifecycle in a product response', () => {
    expect(
      ProductResponseSchema.safeParse({
        ...sampleResponse,
        lifecycleStatus: 'PAUSED',
      }).success,
    ).toBe(false);
  });

  it('accepts partial product updates, including nullable clears', () => {
    expect(UpdateProductSchema.safeParse({}).success).toBe(true);
    expect(UpdateProductSchema.safeParse({ name: 'Abachi' }).success).toBe(true);
    expect(
      UpdateProductSchema.safeParse({ lifecycleStatus: 'ARCHIVED' }).success,
    ).toBe(true);
    expect(UpdateProductSchema.safeParse({ category: null }).success).toBe(true);
    expect(
      UpdateProductSchema.safeParse({ scientificName: null, description: null })
        .success,
    ).toBe(true);
  });

  it('rejects invalid or unsupported product updates', () => {
    const invalid = [
      { lifecycleStatus: 'PAUSED' },
      { lifecycleStatus: 'RETIRED' },
      { name: '' },
      { name: 'x'.repeat(256) },
      { category: 123 },
      { unexpected: true },
    ];
    for (const value of invalid) {
      expect(UpdateProductSchema.safeParse(value).success, JSON.stringify(value)).toBe(
        false,
      );
    }
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

describe('research persistence contracts', () => {
  it('accepts a bodyless run creation and rejects unknown fields', () => {
    expect(CreateResearchRunSchema.safeParse({}).success).toBe(true);
    expect(CreateResearchRunSchema.safeParse(undefined).success).toBe(true);
    expect(
      CreateResearchRunSchema.safeParse({ opportunityId: 'x' }).success,
    ).toBe(false);
  });

  it('only allows a pause reason on a PAUSED run and requires one there', () => {
    expect(
      UpdateResearchRunSchema.safeParse({ status: 'PAUSED' }).success,
    ).toBe(false);
    expect(
      UpdateResearchRunSchema.safeParse({
        status: 'PAUSED',
        pauseReason: 'BUDGET_EXHAUSTED',
      }).success,
    ).toBe(true);
    expect(
      UpdateResearchRunSchema.safeParse({
        status: 'RUNNING',
        pauseReason: 'NEEDS_HUMAN',
      }).success,
    ).toBe(false);
    expect(
      UpdateResearchRunSchema.safeParse({ status: 'FAILED' }).success,
    ).toBe(false);
    expect(
      UpdateResearchRunSchema.safeParse({
        status: 'FAILED',
        errorCode: 'provider_unavailable',
      }).success,
    ).toBe(true);
    expect(
      UpdateResearchRunSchema.safeParse({
        checkpoint: {
          coverage: [
            { targetMarketId: 'm1', dimension: 'suppliers', status: 'PARTIAL' },
          ],
          pendingFollowUps: [{ kind: 'SOURCE', ref: 'source-1' }],
        },
      }).success,
    ).toBe(true);
  });

  it('validates query, source, and evidence payloads', () => {
    expect(
      RecordResearchQuerySchema.safeParse({
        queryText: 'abachi suppliers LT',
        provider: 'exa',
        status: 'SUCCEEDED',
        resultCount: 3,
      }).success,
    ).toBe(true);
    expect(
      RecordResearchQuerySchema.safeParse({ queryText: '' }).success,
    ).toBe(false);

    expect(
      RegisterSourceSchema.safeParse({ url: 'https://example.invalid/a' })
        .success,
    ).toBe(true);
    expect(RegisterSourceSchema.safeParse({ url: 'not-a-url' }).success).toBe(
      false,
    );

    expect(
      PersistEvidenceSchema.safeParse({
        url: 'https://example.invalid/a',
        evidenceText: 'A fetched observation.',
        verificationStatus: 'VERIFIED',
      }).success,
    ).toBe(true);
    expect(
      PersistEvidenceSchema.safeParse({
        url: 'https://example.invalid/a',
        evidenceText: '',
      }).success,
    ).toBe(false);
  });

  it('requires evidence for FACT/INFERENCE claims and forbids it for UNKNOWN', () => {
    expect(
      PersistClaimSchema.safeParse({
        type: 'FACT',
        statement: 'A fact.',
      }).success,
    ).toBe(false);
    expect(
      PersistClaimSchema.safeParse({
        type: 'FACT',
        statement: 'A fact.',
        evidence: [{ evidenceId: 'e1', stance: 'SUPPORTS' }],
      }).success,
    ).toBe(true);
    expect(
      PersistClaimSchema.safeParse({
        type: 'UNKNOWN',
        statement: 'Not established.',
        evidence: [{ evidenceId: 'e1' }],
      }).success,
    ).toBe(false);
    expect(
      PersistClaimSchema.safeParse({
        type: 'UNKNOWN',
        statement: 'Not established.',
      }).success,
    ).toBe(true);
  });

  it('validates a claim correction: retraction vs replacement', () => {
    const replacementClaimId = '11111111-1111-4111-8111-111111111111';

    expect(
      CorrectClaimSchema.safeParse({
        kind: 'REPLACEMENT',
        reason: 'Price unit corrected to per linear metre.',
        replacementClaimId,
      }).success,
    ).toBe(true);
    expect(
      CorrectClaimSchema.safeParse({
        kind: 'RETRACTION',
        reason: 'Superseded by a corrected inference.',
      }).success,
    ).toBe(true);

    // A REPLACEMENT requires a replacement id; a RETRACTION must not carry one.
    expect(
      CorrectClaimSchema.safeParse({ kind: 'REPLACEMENT', reason: 'r' }).success,
    ).toBe(false);
    expect(
      CorrectClaimSchema.safeParse({
        kind: 'RETRACTION',
        reason: 'r',
        replacementClaimId,
      }).success,
    ).toBe(false);

    // Reason is required, unknown fields are rejected, ids must be UUIDs.
    expect(
      CorrectClaimSchema.safeParse({ kind: 'RETRACTION', reason: '   ' })
        .success,
    ).toBe(false);
    expect(
      CorrectClaimSchema.safeParse({ kind: 'RETRACTION', reason: 'r', extra: 1 })
        .success,
    ).toBe(false);
    expect(
      CorrectClaimSchema.safeParse({
        kind: 'REPLACEMENT',
        reason: 'r',
        replacementClaimId: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });
});
