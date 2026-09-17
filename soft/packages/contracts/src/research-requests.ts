import { z } from 'zod';

/**
 * Product-independent market research request contracts.
 *
 * A research request is a `QUEUED` research run plus validated operator
 * parameters (goals, geography, segment policy, questions, constraints, and a
 * bounded standard execution scope). The vocabulary is deliberately generic so
 * the same flow serves any product (e.g. timber cladding or cacao beans); no
 * timber-, dimension- or price-unit-specific fields exist here.
 */

/** What the operator wants the research to achieve. */
export const ResearchGoalSchema = z.enum([
  'SUPPLIERS_MANUFACTURERS',
  'POTENTIAL_BUYERS',
  'PRICES',
  'COMPETITORS_SUBSTITUTES',
  'DISTRIBUTION_CHANNELS',
]);

/**
 * Whether the operator fixed the market segment(s) or asked the researcher to
 * identify them. `IDENTIFY_DURING_RESEARCH` is stored with the explicit,
 * non-commercial segment marker `UNSPECIFIED` — it never invents a segment.
 */
export const ResearchSegmentPolicySchema = z.enum([
  'SPECIFIED',
  'IDENTIFY_DURING_RESEARCH',
]);

/** Explicit, non-commercial marker used when the segment is not yet known. */
export const UNSPECIFIED_SEGMENT = 'UNSPECIFIED';

/**
 * How the request is permitted to spend on research tools.
 * - `FREE_ONLY`: only tools with an established free tier; no paid usage. Free
 *   provider quotas are finite and external, so a run can pause on provider
 *   quota exhaustion **before** the request's numerical limits are reached.
 * - `METERED_APPROVED`: explicitly named metered tools are permitted within
 *   finite, human-approved call limits. Billable usage is permitted and the
 *   monetary cost may be `UNKNOWN`; there is no hard euro spending cap.
 */
export const ResearchCostPolicySchema = z.enum(['FREE_ONLY', 'METERED_APPROVED']);

/** Research tool providers a request may permit. */
export const ResearchToolProviderSchema = z.enum(['EXA', 'FIRECRAWL', 'GEMINI']);

/**
 * A finite provider permission for `METERED_APPROVED`. Only a bounded number of
 * **attempted** calls is granted; retries and failures count against it, and the
 * limit is checked before each call.
 */
export const MeteredProviderLimitSchema = z.strictObject({
  provider: ResearchToolProviderSchema,
  maxCalls: z.number().int().min(1).max(500),
});

/** Tools with an established free tier, usable under `FREE_ONLY`. */
export const FREE_TIER_PROVIDERS = ['EXA', 'FIRECRAWL'] as const;

/**
 * Tools whose free usage cannot be established and which may therefore be
 * billable; excluded under `FREE_ONLY`. `UNKNOWN` cost is not proof of free use.
 */
export const POTENTIALLY_BILLABLE_PROVIDERS = ['GEMINI'] as const;

/**
 * One clearly described standard research scope with finite execution limits.
 * The operator may tighten these inside an expandable "technical limits"
 * section; the server validates them.
 */
export const StandardResearchScopeSchema = z
  .strictObject({
    maxQueries: z.number().int().min(1).max(200),
    maxSources: z.number().int().min(1).max(500),
    maxRuntimeMinutes: z.number().int().min(1).max(1440),
    maxCountries: z.number().int().min(1).max(50),
    costPolicy: ResearchCostPolicySchema.default('FREE_ONLY'),
    /** Provider permissions; required for `METERED_APPROVED`, forbidden for
     * `FREE_ONLY`. Provider *permissions* are separate from temporary provider
     * *availability* (quota/health), which is tracked by the run checkpoint. */
    meteredProviders: z.array(MeteredProviderLimitSchema).max(10).optional(),
  })
  .refine(
    (value) =>
      value.costPolicy !== 'METERED_APPROVED' ||
      (value.meteredProviders !== undefined &&
        value.meteredProviders.length > 0),
    {
      message:
        'METERED_APPROVED requires at least one permitted provider with a finite call limit',
      path: ['meteredProviders'],
    },
  )
  .refine(
    (value) =>
      value.costPolicy !== 'FREE_ONLY' ||
      value.meteredProviders === undefined ||
      value.meteredProviders.length === 0,
    {
      message: 'FREE_ONLY must not carry metered provider permissions',
      path: ['meteredProviders'],
    },
  );

/** The default standard scope the dashboard prefills (bounded, free-only). */
export const DEFAULT_STANDARD_RESEARCH_SCOPE = {
  maxQueries: 40,
  maxSources: 120,
  maxRuntimeMinutes: 240,
  maxCountries: 10,
  costPolicy: 'FREE_ONLY',
} as const;

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);

function hasDuplicates(values: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export const ResearchRequestParametersSchema = z
  .strictObject({
    countries: z.array(nonEmptyText(120)).min(1).max(50),
    goals: z.array(ResearchGoalSchema).min(1).max(5),
    segmentPolicy: ResearchSegmentPolicySchema,
    segments: z.array(nonEmptyText(255)).max(50).optional(),
    questions: z.array(nonEmptyText(2000)).max(50).optional(),
    constraints: z.array(nonEmptyText(2000)).max(50).optional(),
    limits: StandardResearchScopeSchema,
  })
  .refine((value) => !hasDuplicates(value.countries), {
    message: 'countries must be unique',
    path: ['countries'],
  })
  .refine((value) => !hasDuplicates(value.goals), {
    message: 'goals must be unique',
    path: ['goals'],
  })
  .refine((value) => value.countries.length <= value.limits.maxCountries, {
    message: 'the number of countries exceeds the standard scope limit',
    path: ['limits', 'maxCountries'],
  })
  .refine(
    (value) =>
      value.segmentPolicy !== 'SPECIFIED' ||
      (value.segments !== undefined && value.segments.length > 0),
    {
      message:
        'provide at least one segment or choose to identify segments during research',
      path: ['segments'],
    },
  )
  .refine(
    (value) =>
      value.segmentPolicy !== 'IDENTIFY_DURING_RESEARCH' ||
      value.segments === undefined ||
      value.segments.length === 0,
    {
      message:
        'segments cannot be supplied when identifying them during research',
      path: ['segments'],
    },
  )
  .refine(
    (value) =>
      value.segments === undefined || !hasDuplicates(value.segments),
    { message: 'segments must be unique', path: ['segments'] },
  );

/**
 * Submits a research request for one product. The operator never supplies an
 * Offer/Opportunity id; `offerName` is an optional operator-facing tie-breaker
 * when the product has more than one offer. `requestKey` makes a double-click
 * or retry idempotent.
 */
export const CreateResearchRequestSchema = z.strictObject({
  productId: z.uuid(),
  offerName: nonEmptyText(255).optional(),
  requestKey: z.string().trim().min(8).max(120).optional(),
  parameters: ResearchRequestParametersSchema,
});

export type ResearchGoal = z.infer<typeof ResearchGoalSchema>;
export type ResearchSegmentPolicy = z.infer<
  typeof ResearchSegmentPolicySchema
>;
export type ResearchCostPolicy = z.infer<typeof ResearchCostPolicySchema>;
export type StandardResearchScope = z.infer<typeof StandardResearchScopeSchema>;
export type ResearchRequestParameters = z.infer<
  typeof ResearchRequestParametersSchema
>;
export type CreateResearchRequestInput = z.infer<
  typeof CreateResearchRequestSchema
>;
export type ResearchToolProvider = z.infer<typeof ResearchToolProviderSchema>;
export type MeteredProviderLimit = z.infer<typeof MeteredProviderLimitSchema>;

/** Run-scoped provider usage counters. `attemptedCalls` includes retries and
 * failures so a limit cannot be exceeded by a retry loop. */
export interface ProviderUsageCounter {
  provider: string;
  attemptedCalls: number;
}

export type ProviderCallDecision =
  | 'ALLOWED'
  | 'FREE_ONLY_EXCLUDES_PROVIDER'
  | 'PROVIDER_NOT_PERMITTED'
  | 'CALL_LIMIT_REACHED';

/**
 * Decides whether a provider call may be attempted, from the request's persisted
 * permissions and the run's recorded usage. This is a **pure permissions/limits**
 * check: it never considers temporary provider availability (quota/health), which
 * the researcher observes separately and which can pause a run on its own.
 * Attempted calls — including retries and failures — count against a limit.
 */
export function checkProviderCall(
  limits: StandardResearchScope,
  usage: ReadonlyArray<ProviderUsageCounter>,
  provider: ResearchToolProvider,
): {
  allowed: boolean;
  reason: ProviderCallDecision;
  remaining: number | null;
} {
  if (limits.costPolicy === 'FREE_ONLY') {
    if (
      (POTENTIALLY_BILLABLE_PROVIDERS as readonly string[]).includes(provider)
    ) {
      return {
        allowed: false,
        reason: 'FREE_ONLY_EXCLUDES_PROVIDER',
        remaining: null,
      };
    }
    // Free-tier providers have no per-request call ceiling here; the request's
    // numerical limits and the provider's own free quota still apply.
    return { allowed: true, reason: 'ALLOWED', remaining: null };
  }

  const permission = limits.meteredProviders?.find(
    (entry) => entry.provider === provider,
  );
  if (!permission) {
    return { allowed: false, reason: 'PROVIDER_NOT_PERMITTED', remaining: 0 };
  }
  const used =
    usage.find((entry) => entry.provider === provider)?.attemptedCalls ?? 0;
  const remaining = permission.maxCalls - used;
  if (remaining <= 0) {
    return { allowed: false, reason: 'CALL_LIMIT_REACHED', remaining: 0 };
  }
  return { allowed: true, reason: 'ALLOWED', remaining };
}
