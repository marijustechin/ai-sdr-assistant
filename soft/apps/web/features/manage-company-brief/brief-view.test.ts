import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BriefContentRead,
  BriefFindingRead,
  CompanyBriefViewRead,
} from "@entities/company-brief";
import {
  BRIEF_ACTIONS,
  briefPagePath,
  buildBriefSummary,
  buildMeetingPrep,
  orderedSections,
  sourceLabel,
} from "./brief-view";

const here = dirname(fileURLToPath(import.meta.url));

function fact(statement: string): BriefFindingRead {
  return { statement, kind: "KNOWN_FACT" };
}
function enrich(statement: string): BriefFindingRead {
  return { statement, kind: "RECENT_ENRICHMENT" };
}
function hypo(statement: string): BriefFindingRead {
  return { statement, kind: "COMMERCIAL_HYPOTHESIS" };
}

const content: BriefContentRead = {
  atAGlance: ["A", "B", "C", "D"],
  companyOverview: [fact("Overview fact")],
  relevantProductsOperations: [fact("Manufactures outdoor saunas")],
  whyThisAccountFits: [hypo("Agent qualification rationale (inference): may buy")],
  existingRelationshipOutreach: [fact("Reply (INTERESTED) — invited a visit")],
  keyPeopleContacts: [fact("CEO Giedrius Patlaba")],
  financialSizeSignals: [enrich("Revenue 670.8k EUR (2025)")],
  marketsCustomersChannels: [enrich("Ireland, UK")],
  recentActivity: [enrich("2022 facility")],
  reputationPublicFeedback: [enrich("10/10 (2 reviews)")],
  commercialHypotheses: [hypo("Thermo Abachi may fit")],
  thingsToKnowBeforeMeeting: [fact("Respond personally")],
  questionsWorthAsking: ["Q1", "Q2", "Q3", "Q4"],
  unknownsGaps: ["U1", "U2", "U3"],
};

const view: CompanyBriefViewRead = {
  brief: {
    id: "brief-1",
    opportunityId: "opp-1",
    companyId: "co-1",
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
  },
  latest: {
    id: "snap-4",
    briefId: "brief-1",
    version: 4,
    status: "ENRICHED",
    preparedAt: "2026-09-30T09:44:40.000Z",
    lastRefreshedAt: "2026-09-30T10:47:20.000Z",
    sourceCount: 12,
    content,
    enrichmentNote: null,
    createdAt: "2026-09-30T10:47:20.000Z",
  },
  history: [
    {
      version: 4,
      status: "ENRICHED",
      preparedAt: "2026-09-30T09:44:40.000Z",
      lastRefreshedAt: "2026-09-30T10:47:20.000Z",
      sourceCount: 12,
    },
  ],
};

describe("company brief view helpers", () => {
  it("builds a compact summary that excludes the full sections", () => {
    const summary = buildBriefSummary(view);
    expect(summary).toMatchObject({
      status: "ENRICHED",
      version: 4,
      sourceCount: 12,
      lastRefreshedAt: "2026-09-30T10:47:20.000Z",
    });
    expect(summary.points).toEqual(["A", "B", "C"]);
    // No full-brief content leaks into the compact row summary.
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("Manufactures outdoor saunas");
    expect(serialized).not.toContain("Revenue 670.8k EUR");
    expect(serialized).not.toContain("companyOverview");
  });

  it("derives the meeting-prep block from existing brief content only", () => {
    const prep = buildMeetingPrep(content);
    expect(prep.whatTheyDo).toBe(content.relevantProductsOperations[0]!.statement);
    expect(prep.whyFit).toBe(content.whyThisAccountFits[0]!.statement);
    expect(prep.keyContact).toBe(content.keyPeopleContacts[0]!.statement);
    expect(prep.relationship).toBe(
      content.existingRelationshipOutreach[0]!.statement,
    );
    expect(prep.sizeSignal).toBe(content.financialSizeSignals[0]!.statement);
    expect(prep.unknowns).toEqual(content.unknownsGaps.slice(0, 2));
    expect(prep.questions).toEqual(content.questionsWorthAsking.slice(0, 3));
  });

  it("orders all brief sections with labels (At a glance first)", () => {
    const sections = orderedSections();
    expect(sections).toHaveLength(14);
    expect(sections[0]!.key).toBe("atAGlance");
    expect(sections.map((s) => s.key)).toEqual([
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
    ]);
    expect(sections.every((s) => s.label.length > 0)).toBe(true);
  });

  it("maps source URLs to compact labels without losing the URL", () => {
    expect(sourceLabel("https://rekvizitai.vz.lt/imone/wood_architects/")).toBe(
      "Rekvizitai",
    );
    expect(sourceLabel("https://scoris.lt/imone/305933857")).toBe("Scoris");
    expect(sourceLabel("https://www.woodarchitects.eu/en/about")).toBe(
      "Official website",
    );
    expect(sourceLabel("https://www.facebook.com/WoodArchitects.eu/")).toBe(
      "Facebook",
    );
    expect(sourceLabel("urn:platform:outreach-assistant")).toBe("Platform");
    // An unknown host keeps its URL-derived identity (no discarding).
    expect(sourceLabel("https://news.example.com/a")).toBe("news.example.com");
  });

  it("navigates to a dedicated brief page path", () => {
    expect(briefPagePath("prod 1", "brief/2")).toBe(
      "/products/prod%201/leads/company-briefs/brief%2F2",
    );
  });

  it("exposes only read/prepare intelligence actions", () => {
    expect([...BRIEF_ACTIONS]).toEqual(["Refresh", "Request enrichment"]);
    for (const action of BRIEF_ACTIONS) {
      expect(action).not.toMatch(/send|follow|deal|close|email/i);
    }
  });
});

describe("brief UI wiring (regression guards)", () => {
  const resultsSource = readFileSync(
    join(here, "..", "manage-outreach-results", "results-section.tsx"),
    "utf8",
  );
  const documentSource = readFileSync(
    join(here, "company-brief-document.tsx"),
    "utf8",
  );

  it("Outreach Results no longer renders the full brief inline", () => {
    expect(resultsSource).toContain("Open full brief");
    expect(resultsSource).toContain("briefPagePath");
    // The inline panel / expansion is gone.
    expect(resultsSource).not.toContain("CompanyBriefPanel");
    expect(resultsSource).not.toContain("CompanyBriefDocument");
    expect(resultsSource).not.toContain("<details");
  });

  it("provides a dedicated brief page route", () => {
    const pageFile = join(
      here,
      "..",
      "..",
      "app",
      "(dashboard)",
      "products",
      "[id]",
      "leads",
      "company-briefs",
      "[briefId]",
      "page.tsx",
    );
    expect(existsSync(pageFile)).toBe(true);
  });

  it("renders the structured sections on the brief document and has no sending action", () => {
    expect(documentSource).toContain("orderedSections");
    expect(documentSource).toContain("Before the meeting");
    expect(documentSource).toContain("Request enrichment");
    expect(documentSource).not.toMatch(/\bsend\b/i);
    expect(documentSource).not.toMatch(/follow-?up/i);
  });
});
