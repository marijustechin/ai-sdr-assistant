import { describe, expect, it } from "vitest";
import {
  buildOpportunityRuns,
  hasNoOpportunities,
  NO_OPPORTUNITIES_MESSAGE,
  NO_RUNS_MESSAGE,
  researchIndexPath,
  researchRunPath,
  runsEmptyMessage,
} from "./navigation";
import type { OpportunityRead, ResearchRunSummary } from "./types";

const opportunity: OpportunityRead = {
  id: "opp-1",
  offerId: "offer-1",
  name: "Thermo Abachi Cladding - European wave 1",
  objective: "Verify exact-match suppliers.",
  lifecycleStatus: "DRAFT",
  contextVersion: 7,
  targetMarkets: [],
};

const run: ResearchRunSummary = {
  id: "run-1",
  opportunityId: "opp-1",
  status: "PAUSED",
  contextVersion: 7,
  pauseReason: "DIMINISHING_RETURNS",
  requestedAt: "2026-09-15T11:41:22.662Z",
  startedAt: "2026-09-15T11:41:22.645Z",
  finishedAt: null,
  checkpointAt: "2026-09-15T11:59:46.014Z",
};

describe("research navigation", () => {
  it("reports when a product has no opportunities", () => {
    expect(hasNoOpportunities([])).toBe(true);
    expect(hasNoOpportunities([opportunity])).toBe(false);
    expect(NO_OPPORTUNITIES_MESSAGE).toMatch(/no opportunity/i);
  });

  it("pairs opportunities with their runs", () => {
    const items = buildOpportunityRuns(
      [opportunity],
      new Map([[opportunity.id, [run]]]),
    );
    expect(items[0]?.runs).toHaveLength(1);
    expect(items[0]?.runs[0]?.id).toBe("run-1");
  });

  it("shows an empty state when an opportunity has no runs", () => {
    const items = buildOpportunityRuns([opportunity], new Map());
    expect(runsEmptyMessage(items[0]!)).toBe(NO_RUNS_MESSAGE);
    const withRuns = buildOpportunityRuns(
      [opportunity],
      new Map([[opportunity.id, [run]]]),
    );
    expect(runsEmptyMessage(withRuns[0]!)).toBeNull();
  });

  it("builds encoded links without hardcoding ids", () => {
    expect(researchIndexPath("p 1")).toBe("/products/p%201/research");
    expect(researchRunPath("p 1", "o 1", "r 1")).toBe(
      "/products/p%201/research/o%201/r%201",
    );
  });
});
