import type { CoverageCell } from "./checkpoint";
import type { TargetMarketRead } from "./types";

/**
 * Coverage matrix view-model.
 *
 * A coverage cell carries a `targetMarketId`; the country and application
 * (segment) come from the opportunity's own target markets — never parsed from
 * the free-text cell note. An unresolved id is shown as unknown rather than
 * guessed. Sauna/bathhouse and exterior/facade segments stay separate because
 * they are different recorded segments.
 */

export interface CoverageGroup {
  targetMarketId: string;
  /** Recorded country, or null when the id is not among the opportunity's markets. */
  country: string | null;
  /** Recorded segment (application), or null when unresolved. */
  application: string | null;
  resolved: boolean;
  cells: CoverageCell[];
  /** Distinct recorded dimensions in this group, sorted. */
  dimensions: string[];
}

export const COVERED_EXPLANATION =
  "“COVERED” describes the recorded coverage area, not a complete assessment of the country or European market.";

export const APPLICATION_SEPARATION_NOTE =
  "Sauna/bathhouse and exterior/facade are recorded as separate segments and are never combined or averaged.";

export const NO_COVERAGE_MESSAGE =
  "No coverage was recorded in this run's checkpoint.";

export function isGap(cell: CoverageCell): boolean {
  return cell.status.trim().toUpperCase() === "GAP";
}

export function coverageGaps(cells: CoverageCell[]): CoverageCell[] {
  return cells.filter(isGap);
}

export function buildCoverageGroups(
  cells: CoverageCell[],
  markets: TargetMarketRead[],
): CoverageGroup[] {
  const byId = new Map<string, TargetMarketRead>();
  for (const market of markets) {
    byId.set(market.id, market);
  }

  const groups = new Map<string, CoverageGroup>();
  for (const cell of cells) {
    let group = groups.get(cell.targetMarketId);
    if (!group) {
      const market = byId.get(cell.targetMarketId);
      group = {
        targetMarketId: cell.targetMarketId,
        country: market?.country ?? null,
        application: market?.segment ?? null,
        resolved: market !== undefined,
        cells: [],
        dimensions: [],
      };
      groups.set(cell.targetMarketId, group);
    }
    group.cells.push(cell);
  }

  for (const group of groups.values()) {
    group.dimensions = [...new Set(group.cells.map((cell) => cell.dimension))].sort(
      (a, b) => a.localeCompare(b),
    );
  }

  return [...groups.values()].sort((a, b) => {
    const country = (a.country ?? "\uffff").localeCompare(b.country ?? "\uffff");
    if (country !== 0) return country;
    const application = (a.application ?? "\uffff").localeCompare(
      b.application ?? "\uffff",
    );
    if (application !== 0) return application;
    return a.targetMarketId.localeCompare(b.targetMarketId);
  });
}
