import {
  DEFAULT_STANDARD_RESEARCH_SCOPE,
  type CreateResearchRequestInput,
  type ResearchCostPolicy,
  type ResearchGoal,
  type ResearchSegmentPolicy,
  type ResearchToolProvider,
} from "@ai-sdr/contracts";

/**
 * Client-side helpers for the market research request form. Vocabulary is
 * deliberately generic so the same form serves any product; nothing here knows
 * about timber, dimensions, sauna/facade, or price units.
 */

export const GOAL_OPTIONS: ReadonlyArray<{
  value: ResearchGoal;
  label: string;
  description: string;
}> = [
  {
    value: "SUPPLIERS_MANUFACTURERS",
    label: "Suppliers / manufacturers",
    description: "Who makes or supplies the product.",
  },
  {
    value: "POTENTIAL_BUYERS",
    label: "Potential buyers",
    description: "Who might buy it and where they are.",
  },
  {
    value: "PRICES",
    label: "Prices",
    description: "Public prices as stated, with currency and unit.",
  },
  {
    value: "COMPETITORS_SUBSTITUTES",
    label: "Competitors / substitutes",
    description: "Alternative and adjacent products.",
  },
  {
    value: "DISTRIBUTION_CHANNELS",
    label: "Distribution channels",
    description: "How the product reaches buyers.",
  },
];

export const GOAL_LABELS: Record<ResearchGoal, string> = Object.fromEntries(
  GOAL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ResearchGoal, string>;

export const SEGMENT_POLICY_OPTIONS: ReadonlyArray<{
  value: ResearchSegmentPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "SPECIFIED",
    label: "I will specify segment(s)",
    description: "Research only these market segments.",
  },
  {
    value: "IDENTIFY_DURING_RESEARCH",
    label: "Identify during research",
    description:
      "Start without a fixed segment; the researcher proposes segments as findings.",
  },
];

/**
 * Generic, editable segment proposals derived from the selected goals. They are
 * suggestions only — never a commercial market segment and never product
 * specific.
 */
export const GOAL_SEGMENT_SUGGESTIONS: Record<ResearchGoal, string[]> = {
  SUPPLIERS_MANUFACTURERS: ["suppliers", "manufacturers"],
  POTENTIAL_BUYERS: ["potential buyers"],
  PRICES: ["current price listings"],
  COMPETITORS_SUBSTITUTES: ["competitors", "substitute products"],
  DISTRIBUTION_CHANNELS: ["distributors", "importers", "marketplaces"],
};

export const COST_POLICY_OPTIONS: ReadonlyArray<{
  value: ResearchCostPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "FREE_ONLY",
    label: "Free-tier tools only",
    description:
      "Use only tools with an established free tier (Exa, Firecrawl). Provider free quotas are finite and can pause the run before the numerical limits are reached; no paid usage.",
  },
  {
    value: "METERED_APPROVED",
    label: "Metered tools within approved call limits",
    description:
      "Permit named metered providers up to finite call limits. Billable usage is permitted and monetary cost may be UNKNOWN; there is no hard euro spending cap.",
  },
];

export const PROVIDER_OPTIONS: ReadonlyArray<{
  value: ResearchToolProvider;
  label: string;
  freeTier: boolean;
}> = [
  { value: "EXA", label: "Exa websearch", freeTier: true },
  { value: "FIRECRAWL", label: "Firecrawl keyless", freeTier: true },
  { value: "GEMINI", label: "Gemini (Google Search grounding)", freeTier: false },
];

export const DEFAULT_METERED_MAX_CALLS = 25;

export interface ResearchRequestFormValues {
  countries: string;
  goals: ResearchGoal[];
  segmentPolicy: ResearchSegmentPolicy;
  segments: string;
  questions: string;
  constraints: string;
  costPolicy: ResearchCostPolicy;
  meteredProviders: ResearchToolProvider[];
  meteredMaxCalls: Record<ResearchToolProvider, string>;
  maxQueries: string;
  maxSources: string;
  maxRuntimeMinutes: string;
  maxCountries: string;
}

export function initialFormValues(): ResearchRequestFormValues {
  return {
    countries: "",
    goals: [],
    segmentPolicy: "IDENTIFY_DURING_RESEARCH",
    segments: "",
    questions: "",
    constraints: "",
    costPolicy: "FREE_ONLY",
    meteredProviders: [],
    meteredMaxCalls: {
      EXA: String(DEFAULT_METERED_MAX_CALLS),
      FIRECRAWL: String(DEFAULT_METERED_MAX_CALLS),
      GEMINI: String(DEFAULT_METERED_MAX_CALLS),
    },
    maxQueries: String(DEFAULT_STANDARD_RESEARCH_SCOPE.maxQueries),
    maxSources: String(DEFAULT_STANDARD_RESEARCH_SCOPE.maxSources),
    maxRuntimeMinutes: String(
      DEFAULT_STANDARD_RESEARCH_SCOPE.maxRuntimeMinutes,
    ),
    maxCountries: String(DEFAULT_STANDARD_RESEARCH_SCOPE.maxCountries),
  };
}

/** Split a free-text field into a trimmed, de-duplicated, order-preserving list. */
export function parseList(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(/[\n,]+/)) {
    const item = raw.trim();
    if (item.length === 0) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export interface BuildInputOptions {
  productId: string;
  requestKey: string;
}

function toPositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Converts the form values into the shared `CreateResearchRequestInput`. The
 * server action re-validates the result against `CreateResearchRequestSchema`,
 * so this is a convenience mapping, not the trust boundary.
 */
export function buildResearchRequestInput(
  values: ResearchRequestFormValues,
  options: BuildInputOptions,
): CreateResearchRequestInput {
  const goals = values.goals;
  const segments = parseList(values.segments);
  const questions = parseList(values.questions);
  const constraints = parseList(values.constraints);

  return {
    productId: options.productId,
    requestKey: options.requestKey,
    parameters: {
      countries: parseList(values.countries),
      goals,
      segmentPolicy: values.segmentPolicy,
      ...(values.segmentPolicy === "SPECIFIED" && segments.length > 0
        ? { segments }
        : {}),
      ...(questions.length > 0 ? { questions } : {}),
      ...(constraints.length > 0 ? { constraints } : {}),
      limits: {
        maxQueries: toPositiveInt(
          values.maxQueries,
          DEFAULT_STANDARD_RESEARCH_SCOPE.maxQueries,
        ),
        maxSources: toPositiveInt(
          values.maxSources,
          DEFAULT_STANDARD_RESEARCH_SCOPE.maxSources,
        ),
        maxRuntimeMinutes: toPositiveInt(
          values.maxRuntimeMinutes,
          DEFAULT_STANDARD_RESEARCH_SCOPE.maxRuntimeMinutes,
        ),
        maxCountries: toPositiveInt(
          values.maxCountries,
          DEFAULT_STANDARD_RESEARCH_SCOPE.maxCountries,
        ),
        costPolicy: values.costPolicy,
        ...(values.costPolicy === "METERED_APPROVED"
          ? {
              meteredProviders: values.meteredProviders.map((provider) => ({
                provider,
                maxCalls: toPositiveInt(
                  values.meteredMaxCalls[provider],
                  DEFAULT_METERED_MAX_CALLS,
                ),
              })),
            }
          : {}),
      },
    },
  };
}

/** One-line scope sentence shown in the review summary and the run view. */
export function describeStandardScope(values: ResearchRequestFormValues): string {
  return `Up to ${values.maxQueries} queries, ${values.maxSources} sources, ${values.maxRuntimeMinutes} minutes and ${values.maxCountries} countries.`;
}

function providerLabel(provider: ResearchToolProvider): string {
  return PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider;
}

/**
 * Human-readable cost/tool permission sentence for the review summary and the
 * run view. Never promises a euro cap.
 */
export function describeCostPolicy(values: ResearchRequestFormValues): string {
  if (values.costPolicy === "FREE_ONLY") {
    return "Free-tier tools only (Exa, Firecrawl). Provider free quotas are finite and can pause the run before the numerical limits are reached; no paid usage.";
  }
  const grants = values.meteredProviders
    .map(
      (provider) =>
        `${providerLabel(provider)} ≤ ${toPositiveInt(
          values.meteredMaxCalls[provider],
          DEFAULT_METERED_MAX_CALLS,
        )} calls`,
    )
    .join("; ");
  return `Metered tools permitted within approved call limits: ${
    grants.length > 0 ? grants : "no provider selected yet"
  }. Billable usage is permitted and monetary cost may be UNKNOWN; there is no hard euro spending cap.`;
}
