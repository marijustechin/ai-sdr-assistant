import type {
  ClaimConfidence,
  ClaimEvidenceLinkRead,
  ClaimEvidenceStance,
  ClaimLifecycleStatus,
  ClaimRead,
  ClaimType,
  EvidenceRead,
} from "./types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  FACT: "Fact",
  INFERENCE: "Inference",
  UNKNOWN: "Unknown",
};

export const CLAIM_TYPE_TONE: Record<ClaimType, Tone> = {
  FACT: "success",
  INFERENCE: "info",
  UNKNOWN: "neutral",
};

export const CONFIDENCE_LABEL: Record<ClaimConfidence, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const LIFECYCLE_LABEL: Record<ClaimLifecycleStatus, string> = {
  CURRENT: "Current",
  REPLACED: "Replaced",
  RETRACTED: "Retracted",
};

export const LIFECYCLE_TONE: Record<ClaimLifecycleStatus, Tone> = {
  CURRENT: "success",
  REPLACED: "warning",
  RETRACTED: "danger",
};

export const STANCE_LABEL: Record<ClaimEvidenceStance, string> = {
  SUPPORTS: "Supports",
  REFUTES: "Refutes",
  CONTEXT: "Context",
};

export const STANCE_TONE: Record<ClaimEvidenceStance, Tone> = {
  SUPPORTS: "success",
  REFUTES: "danger",
  CONTEXT: "neutral",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  UNVERIFIED: "Unverified",
};

export interface EvidenceView {
  link: ClaimEvidenceLinkRead;
  /** null when the linked evidence id is not present in the run's evidence list. */
  evidence: EvidenceRead | null;
}

export interface ClaimView {
  claim: ClaimRead;
  evidence: EvidenceView[];
}

/** CURRENT claims are the default findings; everything else is history. */
export function currentClaims(claims: ClaimRead[]): ClaimRead[] {
  return claims.filter((claim) => claim.lifecycleStatus === "CURRENT");
}

export function historicalClaims(claims: ClaimRead[]): ClaimRead[] {
  return claims.filter((claim) => claim.lifecycleStatus !== "CURRENT");
}

export function isHistorical(claim: ClaimRead): boolean {
  return claim.lifecycleStatus !== "CURRENT";
}

/**
 * Resolves each claim's evidence links against the run's evidence records.
 * A missing evidence record is kept as `null` (shown as unavailable) — the
 * claim is never dropped and no evidence is invented.
 */
export function buildClaimViews(
  claims: ClaimRead[],
  evidence: EvidenceRead[],
): ClaimView[] {
  const byId = new Map<string, EvidenceRead>();
  for (const item of evidence) {
    byId.set(item.id, item);
  }
  return claims.map((claim) => ({
    claim,
    evidence: claim.evidence.map((link) => ({
      link,
      evidence: byId.get(link.evidenceId) ?? null,
    })),
  }));
}

export interface ClaimFilters {
  type?: ClaimType;
  confidence?: ClaimConfidence;
  stance?: ClaimEvidenceStance;
  history?: boolean;
}

const TYPES: ClaimType[] = ["FACT", "INFERENCE", "UNKNOWN"];
const CONFIDENCES: ClaimConfidence[] = ["HIGH", "MEDIUM", "LOW"];
const STANCES: ClaimEvidenceStance[] = ["SUPPORTS", "REFUTES", "CONTEXT"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads filters from URL search params, ignoring values outside the API enums. */
export function parseClaimFilters(
  params: Record<string, string | string[] | undefined> = {},
): ClaimFilters {
  const filters: ClaimFilters = {};
  const type = first(params.type);
  if (type && (TYPES as string[]).includes(type)) {
    filters.type = type as ClaimType;
  }
  const confidence = first(params.confidence);
  if (confidence && (CONFIDENCES as string[]).includes(confidence)) {
    filters.confidence = confidence as ClaimConfidence;
  }
  const stance = first(params.stance);
  if (stance && (STANCES as string[]).includes(stance)) {
    filters.stance = stance as ClaimEvidenceStance;
  }
  const history = first(params.history);
  if (history === "1" || history === "true") {
    filters.history = true;
  }
  return filters;
}

/** Applies filters using only fields the API actually returns. */
export function filterClaims(
  claims: ClaimRead[],
  filters: ClaimFilters,
): ClaimRead[] {
  return claims.filter((claim) => {
    if (filters.type && claim.type !== filters.type) return false;
    if (filters.confidence && claim.confidence !== filters.confidence) {
      return false;
    }
    if (
      filters.stance &&
      !claim.evidence.some((link) => link.stance === filters.stance)
    ) {
      return false;
    }
    return true;
  });
}

export interface PreservedOfferingFilters {
  market?: string;
  application?: string;
  matchType?: string;
}

/**
 * Builds a claim-filter href while preserving any active offering filters, so
 * changing one filter namespace does not drop the other.
 */
export function claimFilterHref(
  basePath: string,
  filters: ClaimFilters,
  preserve: PreservedOfferingFilters = {},
): string {
  const params = new URLSearchParams();
  if (preserve.market) params.set("market", preserve.market);
  if (preserve.application) params.set("application", preserve.application);
  if (preserve.matchType) params.set("matchType", preserve.matchType);
  if (filters.type) params.set("type", filters.type);
  if (filters.confidence) params.set("confidence", filters.confidence);
  if (filters.stance) params.set("stance", filters.stance);
  if (filters.history) params.set("history", "1");
  const query = params.toString();
  return query.length > 0 ? `${basePath}?${query}` : basePath;
}

/** The claim a replacement points to, or null for retractions/current claims. */
export function replacementId(claim: ClaimRead): string | null {
  return claim.lifecycleStatus === "REPLACED" ? claim.replacedByClaimId : null;
}
