import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PauseReasonBadge, RunStatusBadge } from "./badges";
import { formatDateTime } from "@/lib/format";
import {
  buildOpportunityRuns,
  NO_OPPORTUNITIES_MESSAGE,
  researchRunPath,
  runsEmptyMessage,
  type OpportunityRuns,
} from "@/lib/research/navigation";
import type {
  OfferRead,
  OpportunityRead,
  ResearchRunSummary,
} from "@/lib/research/types";

function OpportunityBlock({
  item,
  productId,
  offerName,
}: {
  item: OpportunityRuns;
  productId: string;
  offerName: string | null;
}) {
  const { opportunity, runs } = item;
  const empty = runsEmptyMessage(item);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{opportunity.name}</CardTitle>
        <CardDescription>
          {opportunity.objective ?? "No objective recorded."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge tone="outline">Offer: {offerName ?? "unknown"}</Badge>
          <Badge tone="outline">Status: {opportunity.lifecycleStatus}</Badge>
          <Badge tone="outline">Context v{opportunity.contextVersion}</Badge>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Research scope
          </p>
          {opportunity.targetMarkets.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No target markets attached.
            </p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-2">
              {opportunity.targetMarkets.map((market) => (
                <li
                  key={market.id}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                >
                  {market.country} · {market.segment}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Research runs
          </p>
          {empty ? (
            <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {runs.map((run) => (
                <li key={run.id}>
                  <Link
                    href={researchRunPath(productId, opportunity.id, run.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <RunStatusBadge status={run.status} />
                      <PauseReasonBadge reason={run.pauseReason} />
                      <span className="text-muted-foreground">
                        Context v{run.contextVersion}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Requested {formatDateTime(run.requestedAt)} · Checkpoint{" "}
                      {formatDateTime(run.checkpointAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function OpportunityRunsList({
  productId,
  opportunities,
  runsByOpportunityId,
  offers,
}: {
  productId: string;
  opportunities: OpportunityRead[];
  runsByOpportunityId: Map<string, ResearchRunSummary[]>;
  offers: OfferRead[];
}) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            {NO_OPPORTUNITIES_MESSAGE}
          </p>
        </CardContent>
      </Card>
    );
  }

  const offerById = new Map(offers.map((offer) => [offer.id, offer.name]));
  const items = buildOpportunityRuns(opportunities, runsByOpportunityId);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <OpportunityBlock
          key={item.opportunity.id}
          item={item}
          productId={productId}
          offerName={offerById.get(item.opportunity.offerId) ?? null}
        />
      ))}
    </div>
  );
}
