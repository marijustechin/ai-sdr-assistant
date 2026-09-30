import {
  BRIEF_SECTION_LABEL,
  type BriefContentRead,
  type BriefFindingRead,
  type CompanyBriefViewRead,
} from "@entities/company-brief";

/**
 * Presentation helpers for the Company Brief UI. These derive everything from the
 * existing structured brief content only — they never invent conclusions — so the
 * dedicated brief page and the compact Outreach Results summary stay in sync.
 */

/** The reading order of the brief sections (At a glance first). */
export const BRIEF_SECTION_ORDER: Array<keyof BriefContentRead> = [
  "atAGlance",
  "companyOverview",
  "relevantProductsOperations",
  "whyThisAccountFits",
  "existingRelationshipOutreach",
  "keyPeopleContacts",
  "financialSizeSignals",
  "marketsCustomersChannels",
  "recentActivity",
  "reputationPublicFeedback",
  "commercialHypotheses",
  "thingsToKnowBeforeMeeting",
  "questionsWorthAsking",
  "unknownsGaps",
];

export function orderedSections(): Array<{
  key: keyof BriefContentRead;
  label: string;
}> {
  return BRIEF_SECTION_ORDER.map((key) => ({
    key,
    label: BRIEF_SECTION_LABEL[key],
  }));
}

/** The only actions a brief exposes (read/prepare workspace — never sending). */
export const BRIEF_ACTIONS = ["Refresh", "Request enrichment"] as const;

export function briefPagePath(productId: string, briefId: string): string {
  return `/products/${encodeURIComponent(productId)}/leads/company-briefs/${encodeURIComponent(briefId)}`;
}

/** Compact human label for a source URL (full URL stays in the link/anchor). */
export function sourceLabel(url: string): string {
  if (url.startsWith("urn:platform")) return "Platform";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "Source";
  }
  const h = host.replace(/^www\./, "");
  if (h.endsWith("woodarchitects.eu")) return "Official website";
  if (h.includes("rekvizitai")) return "Rekvizitai";
  if (h.includes("scoris")) return "Scoris";
  if (h.includes("facebook")) return "Facebook";
  if (h.includes("pub-lish")) return "PUBlish";
  if (h.endsWith("rekvi.lt")) return "Rekvi.lt";
  if (h.includes("okredo")) return "Okredo";
  if (h.includes("fsaskaita")) return "F-Sąskaita";
  if (h.includes("europages")) return "Europages";
  return h || "Source";
}

export interface BriefSummary {
  status: string;
  version: number;
  lastRefreshedAt: string;
  sourceCount: number;
  /** Very short orientation points (from the brief's own "At a glance"). */
  points: string[];
}

/** Compact summary for the Outreach Results row (no full sections). */
export function buildBriefSummary(view: CompanyBriefViewRead): BriefSummary {
  return {
    status: view.latest.status,
    version: view.latest.version,
    lastRefreshedAt: view.latest.lastRefreshedAt,
    sourceCount: view.latest.sourceCount,
    points: view.latest.content.atAGlance.slice(0, 3),
  };
}

export interface MeetingPrep {
  whatTheyDo: string | null;
  whyFit: string | null;
  keyContact: string | null;
  relationship: string | null;
  sizeSignal: string | null;
  unknowns: string[];
  questions: string[];
}

function firstStatement(findings: BriefFindingRead[]): string | null {
  return findings.length > 0 ? findings[0]!.statement : null;
}

/**
 * "Before the meeting" fast-scan block. Every value is taken verbatim from
 * existing brief content; nothing new is inferred here.
 */
export function buildMeetingPrep(content: BriefContentRead): MeetingPrep {
  const relationship =
    content.existingRelationshipOutreach.find((f) => /reply/i.test(f.statement))
      ?.statement ??
    content.existingRelationshipOutreach.find((f) =>
      /decision/i.test(f.statement),
    )?.statement ??
    null;
  return {
    whatTheyDo:
      firstStatement(content.relevantProductsOperations) ??
      firstStatement(content.companyOverview),
    whyFit:
      firstStatement(content.whyThisAccountFits) ??
      firstStatement(content.commercialHypotheses),
    keyContact: firstStatement(content.keyPeopleContacts),
    relationship,
    sizeSignal: firstStatement(content.financialSizeSignals),
    unknowns: content.unknownsGaps.slice(0, 2),
    questions: content.questionsWorthAsking.slice(0, 3),
  };
}
