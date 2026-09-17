import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APPLICATION_SEPARATION_NOTE,
  buildCoverageGroups,
  coverageGaps,
  COVERED_EXPLANATION,
  NO_COVERAGE_MESSAGE,
  type CoverageGroup,
} from "@/lib/research/coverage";
import type { CoverageCell } from "@/lib/research/checkpoint";
import type { TargetMarketRead } from "@/lib/research/types";

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status.trim().toUpperCase()) {
    case "COVERED":
      return "success";
    case "PARTIAL":
      return "warning";
    case "GAP":
      return "danger";
    default:
      return "neutral";
  }
}

function GroupBlock({ group }: { group: CoverageGroup }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>{group.country ?? "Unknown country"}</span>
          <span className="text-muted-foreground">·</span>
          <span>{group.application ?? "Unknown application"}</span>
        </div>
        {!group.resolved ? (
          <Badge tone="outline">
            Target market not in this opportunity: {group.targetMarketId}
          </Badge>
        ) : null}
      </div>
      <ul className="divide-y divide-border">
        {group.cells.map((cell) => (
          <li
            key={`${cell.dimension}-${cell.status}-${cell.note ?? ""}`}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{cell.dimension}</p>
              {cell.note ? (
                <p className="text-sm text-muted-foreground">{cell.note}</p>
              ) : (
                <p className="text-sm text-muted-foreground/70">
                  No note recorded.
                </p>
              )}
            </div>
            <Badge tone={statusTone(cell.status)}>{cell.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CoverageSection({
  cells,
  markets,
  hasCheckpoint,
}: {
  cells: CoverageCell[];
  markets: TargetMarketRead[];
  hasCheckpoint: boolean;
}) {
  const groups = buildCoverageGroups(cells, markets);
  const gaps = coverageGaps(cells);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coverage by country and application</CardTitle>
        <CardDescription>
          {COVERED_EXPLANATION} {APPLICATION_SEPARATION_NOTE} It records what was
          investigated and what remains missing; where a claim has been
          corrected, the CURRENT claims remain authoritative over this summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasCheckpoint ? (
          <p className="text-sm text-muted-foreground">
            Coverage is unavailable: this run has no checkpoint recorded.
          </p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{NO_COVERAGE_MESSAGE}</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <GroupBlock key={group.targetMarketId} group={group} />
            ))}
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium">Recorded gaps</h4>
          {!hasCheckpoint ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Gaps are unavailable: no checkpoint recorded.
            </p>
          ) : gaps.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No cell is recorded as a gap.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {gaps.map((cell) => (
                <li key={`${cell.targetMarketId}-${cell.dimension}`}>
                  <span className="font-medium text-foreground">
                    {cell.dimension}
                  </span>{" "}
                  — {cell.note ?? "no note recorded"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
