import type {
  AgentQualificationStatus,
  LeadObservedRole,
  LeadRead,
  LeadReviewStatus,
} from "./types";
import type { OpportunityRead } from "@/lib/research/types";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "outline";

export const LEAD_REVIEW_STATUS_LABEL: Record<LeadReviewStatus, string> = {
  UNREVIEWED: "Unreviewed",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
};

export const LEAD_REVIEW_STATUS_TONE: Record<LeadReviewStatus, BadgeTone> = {
  UNREVIEWED: "neutral",
  SHORTLISTED: "success",
  REJECTED: "danger",
};

export const AGENT_QUALIFICATION_LABEL: Record<
  AgentQualificationStatus,
  string
> = {
  NOT_ASSESSED: "Not assessed",
  QUALIFIED: "Agent-qualified",
  NEEDS_MORE_EVIDENCE: "Needs more evidence",
  DISQUALIFIED: "Agent-disqualified",
};

export const AGENT_QUALIFICATION_TONE: Record<
  AgentQualificationStatus,
  BadgeTone
> = {
  NOT_ASSESSED: "neutral",
  QUALIFIED: "success",
  NEEDS_MORE_EVIDENCE: "warning",
  DISQUALIFIED: "danger",
};

export function agentQualificationLabel(
  status: AgentQualificationStatus,
): string {
  return AGENT_QUALIFICATION_LABEL[status];
}

/** True when the candidate may proceed to contact discovery (API-computed). */
export function leadEligibleForContactDiscovery(lead: LeadRead): boolean {
  return lead.eligibleForContactDiscovery;
}

export const LEAD_ROLE_LABEL: Record<LeadObservedRole, string> = {
  MANUFACTURER: "Manufacturer",
  DISTRIBUTOR: "Distributor",
  IMPORTER: "Importer",
  RETAILER: "Retailer",
  FABRICATOR: "Fabricator",
  INSTALLER: "Installer",
  BUILDER: "Builder",
  DESIGNER: "Designer",
  COMPETITOR: "Competitor",
  END_USER: "End user",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

export function leadRoleLabel(role: LeadObservedRole): string {
  return LEAD_ROLE_LABEL[role];
}

export function leadReviewStatusLabel(status: LeadReviewStatus): string {
  return LEAD_REVIEW_STATUS_LABEL[status];
}

/** True when the lead must be re-reviewed (its supporting claim is not CURRENT). */
export function leadNeedsAttention(lead: LeadRead): boolean {
  return lead.needsReview;
}

export interface LeadSummary {
  total: number;
  unreviewed: number;
  shortlisted: number;
  rejected: number;
  needingReview: number;
}

/** Counts for a shortlist view; a lead flagged for review is counted separately. */
export function summarizeLeads(leads: LeadRead[]): LeadSummary {
  const summary: LeadSummary = {
    total: leads.length,
    unreviewed: 0,
    shortlisted: 0,
    rejected: 0,
    needingReview: 0,
  };
  for (const lead of leads) {
    if (lead.reviewStatus === "UNREVIEWED") summary.unreviewed += 1;
    else if (lead.reviewStatus === "SHORTLISTED") summary.shortlisted += 1;
    else if (lead.reviewStatus === "REJECTED") summary.rejected += 1;
    if (lead.needsReview) summary.needingReview += 1;
  }
  return summary;
}

/** Human label for a supporting claim lifecycle (provenance status). */
export function claimLifecycleLabel(
  status: "CURRENT" | "RETRACTED" | "REPLACED",
): string {
  if (status === "CURRENT") return "Current";
  if (status === "RETRACTED") return "Retracted (needs review)";
  return "Replaced (needs review)";
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export function leadsIndexPath(productId: string): string {
  return `/products/${enc(productId)}/leads`;
}

export function leadDetailPath(
  productId: string,
  opportunityId: string,
  leadId: string,
): string {
  return `/products/${enc(productId)}/leads/${enc(opportunityId)}/${enc(leadId)}`;
}

/**
 * Recorded countries of an opportunity, taken from its attached target markets
 * (`targetMarkets[].country`). Never inferred from the opportunity title or a
 * candidate's location. Duplicates are removed, order is preserved.
 */
export function opportunityCountries(opportunity: OpportunityRead): string[] {
  const seen = new Set<string>();
  const countries: string[] = [];
  for (const market of opportunity.targetMarkets) {
    const country = market.country.trim();
    if (country.length === 0) continue;
    const key = country.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    countries.push(country);
  }
  return countries;
}

export interface OpportunityPartition {
  withCandidates: OpportunityRead[];
  withoutCandidates: OpportunityRead[];
}

/**
 * Splits opportunities into those with at least one candidate and those
 * without, preserving the given order.
 */
export function partitionOpportunities(
  opportunities: OpportunityRead[],
  leadsByOpportunityId: Map<string, LeadRead[]>,
): OpportunityPartition {
  const withCandidates: OpportunityRead[] = [];
  const withoutCandidates: OpportunityRead[] = [];
  for (const opportunity of opportunities) {
    const leads = leadsByOpportunityId.get(opportunity.id) ?? [];
    (leads.length > 0 ? withCandidates : withoutCandidates).push(opportunity);
  }
  return { withCandidates, withoutCandidates };
}
