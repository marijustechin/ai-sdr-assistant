import { describe, expect, it } from "vitest";
import type { CoverageCell } from "./checkpoint";
import {
  APPLICATION_SEPARATION_NOTE,
  buildCoverageGroups,
  COVERED_EXPLANATION,
  coverageGaps,
  NO_COVERAGE_MESSAGE,
} from "./coverage";
import type { TargetMarketRead } from "./types";

const markets: TargetMarketRead[] = [
  {
    id: "lt-sauna",
    country: "LT",
    segment: "sauna/bathhouse cladding",
    lifecycleStatus: "ACTIVE",
  },
  {
    id: "lt-facade",
    country: "LT",
    segment: "exterior/facade cladding",
    lifecycleStatus: "ACTIVE",
  },
];

const cells: CoverageCell[] = [
  { targetMarketId: "lt-sauna", dimension: "suppliers", status: "COVERED", note: "a" },
  { targetMarketId: "lt-sauna", dimension: "prices", status: "GAP", note: null },
  { targetMarketId: "lt-facade", dimension: "suppliers", status: "PARTIAL", note: "b" },
  { targetMarketId: "not-in-opportunity", dimension: "suppliers", status: "GAP", note: null },
];

describe("buildCoverageGroups", () => {
  it("keeps sauna/bathhouse and exterior/facade distinct", () => {
    const groups = buildCoverageGroups(cells, markets);
    const sauna = groups.find((group) => group.targetMarketId === "lt-sauna");
    const facade = groups.find((group) => group.targetMarketId === "lt-facade");

    expect(sauna?.application).toBe("sauna/bathhouse cladding");
    expect(facade?.application).toBe("exterior/facade cladding");
    expect(sauna?.country).toBe("LT");
    expect(facade?.country).toBe("LT");
  });

  it("lists each group's recorded dimensions", () => {
    const groups = buildCoverageGroups(cells, markets);
    const sauna = groups.find((group) => group.targetMarketId === "lt-sauna");
    expect(sauna?.dimensions).toEqual(["prices", "suppliers"]);
  });

  it("marks an unresolved target market without inventing geography", () => {
    const groups = buildCoverageGroups(cells, markets);
    const unknown = groups.find(
      (group) => group.targetMarketId === "not-in-opportunity",
    );
    expect(unknown?.resolved).toBe(false);
    expect(unknown?.country).toBeNull();
    expect(unknown?.application).toBeNull();
  });

  it("reports only recorded GAP statuses as gaps", () => {
    expect(
      coverageGaps(cells)
        .map((cell) => cell.targetMarketId)
        .sort(),
    ).toEqual(["lt-sauna", "not-in-opportunity"]);
  });

  it("returns no groups when no coverage is recorded", () => {
    expect(buildCoverageGroups([], markets)).toEqual([]);
  });

  it("explains that COVERED is recorded coverage, not a complete assessment", () => {
    expect(COVERED_EXPLANATION).toMatch(/not a complete assessment/i);
    expect(APPLICATION_SEPARATION_NOTE).toMatch(/never combined/i);
    expect(NO_COVERAGE_MESSAGE).toMatch(/no coverage was recorded/i);
  });
});
