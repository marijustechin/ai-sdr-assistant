import { describe, it, expect } from 'vitest';
import {
  checkProviderCall,
  CreateResearchRequestSchema,
  DEFAULT_STANDARD_RESEARCH_SCOPE,
  ResearchRequestParametersSchema,
  ResearchRunCheckpointSchema,
  StandardResearchScopeSchema,
} from '../src/index.js';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';

function parameters(overrides: Record<string, unknown> = {}) {
  return {
    countries: ['Lithuania'],
    goals: ['SUPPLIERS_MANUFACTURERS'],
    segmentPolicy: 'IDENTIFY_DURING_RESEARCH',
    limits: {
      maxQueries: 40,
      maxSources: 120,
      maxRuntimeMinutes: 240,
      maxCountries: 10,
    },
    ...overrides,
  };
}

describe('research request contracts', () => {
  it('accepts a request with segments identified during research', () => {
    const result = ResearchRequestParametersSchema.safeParse(parameters());
    expect(result.success).toBe(true);
    if (result.success) {
      // costPolicy defaults to free-only; no paid search is allowed.
      expect(result.data.limits.costPolicy).toBe('FREE_ONLY');
    }
  });

  it('requires segments when the operator specifies them', () => {
    expect(
      ResearchRequestParametersSchema.safeParse(
        parameters({ segmentPolicy: 'SPECIFIED' }),
      ).success,
    ).toBe(false);
    expect(
      ResearchRequestParametersSchema.safeParse(
        parameters({ segmentPolicy: 'SPECIFIED', segments: ['suppliers'] }),
      ).success,
    ).toBe(true);
  });

  it('rejects segments when identifying during research', () => {
    expect(
      ResearchRequestParametersSchema.safeParse(
        parameters({
          segmentPolicy: 'IDENTIFY_DURING_RESEARCH',
          segments: ['suppliers'],
        }),
      ).success,
    ).toBe(false);
  });

  it('rejects duplicate countries and geography beyond the limit', () => {
    expect(
      ResearchRequestParametersSchema.safeParse(
        parameters({ countries: ['Lithuania', 'lithuania'] }),
      ).success,
    ).toBe(false);

    expect(
      ResearchRequestParametersSchema.safeParse(
        parameters({
          countries: ['A', 'B', 'C'],
          limits: {
            maxQueries: 10,
            maxSources: 10,
            maxRuntimeMinutes: 10,
            maxCountries: 2,
          },
        }),
      ).success,
    ).toBe(false);
  });

  it('rejects an empty goals list', () => {
    expect(
      ResearchRequestParametersSchema.safeParse(parameters({ goals: [] }))
        .success,
    ).toBe(false);
  });

  it('accepts a valid submission and requires a UUID product id', () => {
    expect(
      CreateResearchRequestSchema.safeParse({
        productId: PRODUCT_ID,
        parameters: parameters(),
      }).success,
    ).toBe(true);

    expect(
      CreateResearchRequestSchema.safeParse({
        productId: 'not-a-uuid',
        parameters: parameters(),
      }).success,
    ).toBe(false);
  });

  it('exposes a bounded default standard scope', () => {
    expect(DEFAULT_STANDARD_RESEARCH_SCOPE.maxQueries).toBeGreaterThan(0);
    expect(DEFAULT_STANDARD_RESEARCH_SCOPE.costPolicy).toBe('FREE_ONLY');
  });
});

describe('research cost/tool permissions', () => {
  const limits = (overrides: Record<string, unknown> = {}) => ({
    maxQueries: 40,
    maxSources: 120,
    maxRuntimeMinutes: 240,
    maxCountries: 10,
    ...overrides,
  });

  it('serialises FREE_ONLY by default and rejects metered grants under it', () => {
    const parsed = StandardResearchScopeSchema.parse(limits());
    expect(parsed.costPolicy).toBe('FREE_ONLY');
    expect(
      StandardResearchScopeSchema.safeParse(
        limits({
          costPolicy: 'FREE_ONLY',
          meteredProviders: [{ provider: 'GEMINI', maxCalls: 10 }],
        }),
      ).success,
    ).toBe(false);
  });

  it('requires finite provider call limits for METERED_APPROVED', () => {
    expect(
      StandardResearchScopeSchema.safeParse(
        limits({ costPolicy: 'METERED_APPROVED' }),
      ).success,
    ).toBe(false);
    const parsed = StandardResearchScopeSchema.safeParse(
      limits({
        costPolicy: 'METERED_APPROVED',
        meteredProviders: [
          { provider: 'GEMINI', maxCalls: 20 },
          { provider: 'EXA', maxCalls: 5 },
        ],
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.meteredProviders).toHaveLength(2);
    }
  });

  it('checks permissions and call limits before a call', () => {
    // FREE_ONLY permits free-tier providers, excludes potentially billable ones.
    const free = StandardResearchScopeSchema.parse(limits());
    expect(checkProviderCall(free, [], 'EXA').allowed).toBe(true);
    const geminiUnderFree = checkProviderCall(free, [], 'GEMINI');
    expect(geminiUnderFree.allowed).toBe(false);
    expect(geminiUnderFree.reason).toBe('FREE_ONLY_EXCLUDES_PROVIDER');

    // METERED_APPROVED enforces the finite limit and counts attempted calls.
    const metered = StandardResearchScopeSchema.parse(
      limits({
        costPolicy: 'METERED_APPROVED',
        meteredProviders: [{ provider: 'GEMINI', maxCalls: 2 }],
      }),
    );
    expect(
      checkProviderCall(metered, [{ provider: 'GEMINI', attemptedCalls: 1 }], 'GEMINI'),
    ).toMatchObject({ allowed: true, remaining: 1 });
    expect(
      checkProviderCall(metered, [{ provider: 'GEMINI', attemptedCalls: 2 }], 'GEMINI'),
    ).toMatchObject({ allowed: false, reason: 'CALL_LIMIT_REACHED', remaining: 0 });
    // A retry/failure that was attempted still counts (attemptedCalls = 2 above).
    expect(
      checkProviderCall(metered, [{ provider: 'GEMINI', attemptedCalls: 0 }], 'FIRECRAWL'),
    ).toMatchObject({ allowed: false, reason: 'PROVIDER_NOT_PERMITTED' });
  });

  it('accepts run-scoped provider usage counters for resume', () => {
    const parsed = ResearchRunCheckpointSchema.safeParse({
      providerUsage: [
        {
          provider: 'GEMINI',
          attemptedCalls: 3,
          succeeded: 2,
          failed: 1,
          retries: 1,
          creditsUsed: 1.5,
          lastAttemptAt: '2026-09-17T10:00:00Z',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a full METERED_APPROVED request through the create schema', () => {
    expect(
      CreateResearchRequestSchema.safeParse({
        productId: PRODUCT_ID,
        parameters: parameters({
          limits: limits({
            costPolicy: 'METERED_APPROVED',
            meteredProviders: [{ provider: 'GEMINI', maxCalls: 25 }],
          }),
        }),
      }).success,
    ).toBe(true);
    expect(
      CreateResearchRequestSchema.safeParse({
        productId: PRODUCT_ID,
        parameters: parameters({
          limits: limits({ costPolicy: 'METERED_APPROVED' }),
        }),
      }).success,
    ).toBe(false);
  });
});
