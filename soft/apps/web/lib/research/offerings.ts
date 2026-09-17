import type { Tone } from "./claims";
import type {
  ClaimRead,
  OfferingMatchType,
  OfferingPriceBasis,
  OfferingRead,
  OfferingSampleKind,
  OfferingVatStatus,
} from "./types";

export const MATCH_TYPE_LABEL: Record<OfferingMatchType, string> = {
  EXACT_MATCH: "Exact match",
  ADJACENT: "Adjacent product",
  SUBSTITUTE: "Substitute",
  UNKNOWN: "Unclassified",
};

export const MATCH_TYPE_TONE: Record<OfferingMatchType, Tone> = {
  EXACT_MATCH: "success",
  ADJACENT: "info",
  SUBSTITUTE: "warning",
  UNKNOWN: "neutral",
};

export const MATCH_ORDER: OfferingMatchType[] = [
  "EXACT_MATCH",
  "ADJACENT",
  "SUBSTITUTE",
  "UNKNOWN",
];

export const VAT_LABEL: Record<OfferingVatStatus, string> = {
  INCLUDED: "VAT included",
  EXCLUDED: "VAT excluded",
  NOT_STATED: "VAT not stated",
  UNKNOWN: "VAT unknown",
};

export const SAMPLE_LABEL: Record<OfferingSampleKind, string> = {
  SAMPLE: "Sample",
  FULL_PRODUCT: "Full product",
  UNKNOWN: "Sample/full unknown",
};

export const BASIS_LABEL: Record<OfferingPriceBasis, string> = {
  RETAIL_LIST: "Retail/list price",
  TRADE_B2B: "Trade/B2B price",
  UNKNOWN: "Price basis unknown",
};

export interface OfferingFilters {
  market?: string;
  application?: string;
  matchType?: OfferingMatchType;
}

export function offeringDisplayName(offering: OfferingRead): string {
  const company = offering.companyText?.trim();
  const product = offering.productText?.trim();
  if (company && product) return `${company} — ${product}`;
  return company ?? product ?? "Unnamed offering";
}

/** Distinct recorded filter values only; nothing is parsed or inferred. */
export function offeringFilterOptions(offerings: OfferingRead[]): {
  markets: string[];
  applications: string[];
  matchTypes: OfferingMatchType[];
} {
  const markets = new Set<string>();
  const applications = new Set<string>();
  const matchTypes = new Set<OfferingMatchType>();
  for (const offering of offerings) {
    if (offering.marketServedText) markets.add(offering.marketServedText);
    if (offering.applicationText) applications.add(offering.applicationText);
    matchTypes.add(offering.matchType);
  }
  return {
    markets: [...markets].sort((a, b) => a.localeCompare(b)),
    applications: [...applications].sort((a, b) => a.localeCompare(b)),
    matchTypes: MATCH_ORDER.filter((type) => matchTypes.has(type)),
  };
}

export function filterOfferings(
  offerings: OfferingRead[],
  filters: OfferingFilters,
): OfferingRead[] {
  return offerings.filter((offering) => {
    if (filters.market && offering.marketServedText !== filters.market) {
      return false;
    }
    if (
      filters.application &&
      offering.applicationText !== filters.application
    ) {
      return false;
    }
    if (filters.matchType && offering.matchType !== filters.matchType) {
      return false;
    }
    return true;
  });
}

const MATCH_TYPES = MATCH_ORDER as string[];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseOfferingFilters(
  params: Record<string, string | string[] | undefined> = {},
): OfferingFilters {
  const filters: OfferingFilters = {};
  const market = first(params.market);
  if (market) filters.market = market;
  const application = first(params.application);
  if (application) filters.application = application;
  const matchType = first(params.matchType);
  if (matchType && MATCH_TYPES.includes(matchType)) {
    filters.matchType = matchType as OfferingMatchType;
  }
  return filters;
}

export interface PreservedClaimFilters {
  type?: string;
  confidence?: string;
  stance?: string;
  history?: boolean;
}

/**
 * Builds an offering-filter href while preserving any active claim filters, so
 * changing one filter namespace does not drop the other.
 */
export function offeringFilterHref(
  basePath: string,
  filters: OfferingFilters,
  preserve: PreservedClaimFilters = {},
): string {
  const params = new URLSearchParams();
  if (filters.market) params.set("market", filters.market);
  if (filters.application) params.set("application", filters.application);
  if (filters.matchType) params.set("matchType", filters.matchType);
  if (preserve.type) params.set("type", preserve.type);
  if (preserve.confidence) params.set("confidence", preserve.confidence);
  if (preserve.stance) params.set("stance", preserve.stance);
  if (preserve.history) params.set("history", "1");
  const query = params.toString();
  return query.length > 0 ? `${basePath}?${query}` : basePath;
}

/** Explicit list of what was NOT recorded for this offering (never guessed). */
export function offeringUncertainty(offering: OfferingRead): string[] {
  const missing: string[] = [];
  if (!offering.priceText?.trim()) missing.push("Price not recorded");
  if (offering.vatStatus === "UNKNOWN") missing.push("VAT treatment unknown");
  if (!offering.companyLocationText?.trim()) {
    missing.push("Company location not recorded");
  }
  if (!offering.marketServedText?.trim()) {
    missing.push("Market served not recorded");
  }
  if (!offering.applicationText?.trim()) {
    missing.push("Application not recorded");
  }
  if (!offering.treatmentText?.trim()) {
    missing.push("Treatment not recorded");
  }
  if (!offering.dimensionsText?.trim()) {
    missing.push("Dimensions not recorded");
  }
  if (offering.matchType === "UNKNOWN") {
    missing.push("Exact/adjacent/substitute not recorded");
  }
  return missing;
}

export interface OfferingGroup {
  matchType: OfferingMatchType;
  offerings: OfferingRead[];
}

export function groupOfferingsByMatch(
  offerings: OfferingRead[],
): OfferingGroup[] {
  return MATCH_ORDER.map((matchType) => ({
    matchType,
    offerings: offerings.filter((offering) => offering.matchType === matchType),
  })).filter((group) => group.offerings.length > 0);
}

/** The CURRENT claim an offering cites, or null (historical/absent). */
export function linkedCurrentClaim(
  offering: OfferingRead,
  currentClaimsById: Map<string, ClaimRead>,
): ClaimRead | null {
  if (!offering.claimId) return null;
  const claim = currentClaimsById.get(offering.claimId) ?? null;
  return claim && claim.lifecycleStatus === "CURRENT" ? claim : null;
}

export type OfferingClaimState =
  | "CURRENT"
  | "REPLACED"
  | "RETRACTED"
  | "MISSING"
  | "NONE";

export interface OfferingClaimReview {
  state: OfferingClaimState;
  /** The linked claim in any lifecycle state (null when absent/unresolved). */
  claim: ClaimRead | null;
}

/**
 * Resolves an offering's linked claim using the existing claim lifecycle, so a
 * REPLACED/RETRACTED link can be flagged for review. Structured offering fields
 * are never rewritten from a replacement; the offering is only flagged.
 */
export function offeringClaimState(
  offering: OfferingRead,
  claimsById: Map<string, ClaimRead>,
): OfferingClaimReview {
  if (!offering.claimId) return { state: "NONE", claim: null };
  const claim = claimsById.get(offering.claimId) ?? null;
  if (!claim) return { state: "MISSING", claim: null };
  if (claim.lifecycleStatus === "CURRENT") return { state: "CURRENT", claim };
  return { state: claim.lifecycleStatus, claim };
}

/** CURRENT findings not linked to any offering (still shown, never discarded). */
export function unlinkedCurrentClaims(
  claims: ClaimRead[],
  offerings: OfferingRead[],
): ClaimRead[] {
  const linked = new Set(
    offerings
      .map((offering) => offering.claimId)
      .filter((id): id is string => id !== null),
  );
  return claims.filter(
    (claim) => claim.lifecycleStatus === "CURRENT" && !linked.has(claim.id),
  );
}
