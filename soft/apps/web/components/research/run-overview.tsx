import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PauseReasonBadge, RunStatusBadge } from "./badges";
import { formatDateTime } from "@/lib/format";
import type {
  OpportunityRead,
  ResearchRunDetail,
  TargetMarketRead,
} from "@/lib/research/types";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function RunOverview({
  run,
  opportunity,
  offerName,
  markets,
}: {
  run: ResearchRunDetail;
  opportunity: OpportunityRead | null;
  offerName: string | null;
  markets: TargetMarketRead[];
}) {
  const marketById = new Map(markets.map((market) => [market.id, market]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run overview</CardTitle>
        <CardDescription>
          Opportunity, scope and lifecycle as persisted by the API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Fact label="Opportunity">
          {opportunity?.name ?? "Unavailable"}
          {opportunity?.objective ? (
            <span className="block text-muted-foreground">
              {opportunity.objective}
            </span>
          ) : null}
        </Fact>
        <Fact label="Offer">{offerName ?? "Unavailable"}</Fact>
        <Fact label="Status">
          <span className="flex flex-wrap items-center gap-2">
            <RunStatusBadge status={run.status} />
            <PauseReasonBadge reason={run.pauseReason} />
          </span>
          {run.pauseNote ? (
            <span className="mt-1 block text-muted-foreground">
              {run.pauseNote}
            </span>
          ) : null}
        </Fact>
        <Fact label="Context version">v{run.contextVersion}</Fact>
        <Fact label="Requested">{formatDateTime(run.requestedAt)}</Fact>
        <Fact label="Started">{formatDateTime(run.startedAt)}</Fact>
        <Fact label="Finished">{formatDateTime(run.finishedAt)}</Fact>
        <Fact label="Checkpoint at">{formatDateTime(run.checkpointAt)}</Fact>
        <Fact label="Run id">
          <span className="font-mono text-xs">{run.id}</span>
        </Fact>
        <Fact label="Scope">
          {run.targetMarketIds.length === 0 ? (
            <span className="text-muted-foreground">No scope recorded.</span>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {run.targetMarketIds.map((id) => {
                const market = marketById.get(id);
                return (
                  <li
                    key={id}
                    className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                  >
                    {market
                      ? `${market.country} · ${market.segment}`
                      : `Unknown target market: ${id}`}
                  </li>
                );
              })}
            </ul>
          )}
        </Fact>
      </CardContent>
    </Card>
  );
}
