import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BASIS_LABEL,
  MATCH_TYPE_LABEL,
  MATCH_TYPE_TONE,
  SAMPLE_LABEL,
  VAT_LABEL,
} from "@/lib/research/offerings";
import {
  formatObservedAmount,
  isSinglePrice,
  type PriceExtreme,
  type PriceGroup,
  type RunSummary as RunSummaryData,
} from "@/lib/research/summary";

function Extreme({
  label,
  extreme,
}: {
  label: string;
  extreme: PriceExtreme;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatObservedAmount(extreme)}</span>
      <a
        href={`#offering-${extreme.offeringId}`}
        className="text-primary underline-offset-2 hover:underline"
      >
        {extreme.companyText ?? extreme.productText ?? "offering"}
      </a>
      {extreme.productText || extreme.dimensionsText ? (
        <span className="text-muted-foreground">
          {[extreme.productText, extreme.dimensionsText]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ) : null}
      <a
        href={extreme.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="break-all text-xs text-primary underline-offset-2 hover:underline"
      >
        {extreme.sourceTitle ?? extreme.sourceUrl}
      </a>
    </div>
  );
}

function PriceGroupBlock({ group }: { group: PriceGroup }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={MATCH_TYPE_TONE[group.matchType]}>
          {MATCH_TYPE_LABEL[group.matchType]}
        </Badge>
        <Badge tone="outline">
          {group.currency} / {group.unit}
        </Badge>
        <Badge tone="outline">{VAT_LABEL[group.vatStatus]}</Badge>
        <Badge tone="outline">{BASIS_LABEL[group.priceBasis]}</Badge>
        <Badge tone="outline">{SAMPLE_LABEL[group.sampleKind]}</Badge>
        {group.treatmentText ? (
          <Badge tone="outline">{group.treatmentText}</Badge>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {group.pricedCount} priced offering
          {group.pricedCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2 space-y-0.5">
        {isSinglePrice(group) ? (
          <Extreme label="Observed price" extreme={group.lowest} />
        ) : (
          <>
            <Extreme label="Lowest observed" extreme={group.lowest} />
            <Extreme label="Highest observed" extreme={group.highest} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Compact, run-scoped summary shown immediately after Run overview. It is
 * computed from the whole run and is deliberately NOT affected by the offering
 * filters on the results list (those filters only change the list below).
 */
export function RunSummary({ summary }: { summary: RunSummaryData }) {
  const { offerings, gaps } = summary;
  const otherMatchCounts = [
    { label: "Exact", count: offerings.byMatchType.EXACT_MATCH },
    { label: "Adjacent", count: offerings.byMatchType.ADJACENT },
    { label: "Substitute", count: offerings.byMatchType.SUBSTITUTE },
    { label: "Unclassified", count: offerings.byMatchType.UNKNOWN },
  ].filter((entry) => entry.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
        <CardDescription>
          Whole run — offering filters below do not change this summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            <span className="text-muted-foreground">
              Identified companies:{" "}
            </span>
            <span className="font-medium">{summary.companyCount}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Offerings: </span>
            <span className="font-medium">{offerings.total}</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Usable prices:{" "}
            <span className="font-medium text-foreground">
              {summary.pricedOfferingCount}
            </span>
          </span>
          <span>
            Price recorded, not structured yet:{" "}
            <span className="font-medium text-foreground">
              {summary.unstructuredPriceCount}
            </span>
          </span>
          <span>
            No price recorded:{" "}
            <span className="font-medium text-foreground">
              {summary.noPriceRecordedCount}
            </span>
          </span>
        </div>

        {otherMatchCounts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>By type:</span>
            {otherMatchCounts.map((entry) => (
              <Badge key={entry.label} tone="outline">
                {entry.label}: {entry.count}
              </Badge>
            ))}
          </div>
        ) : null}

        {summary.companies.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Distinct identified companies
            </p>
            <ul className="mt-1 flex flex-wrap gap-2 text-sm">
              {summary.companies.map((company) => (
                <li
                  key={company.name}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                >
                  {company.name} ({company.offerings})
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              Deduplicated by recorded company name (no canonical company id
              exists yet); source domains and marketplaces are not counted.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No company is recorded on this run&apos;s offerings yet.
          </p>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prices (Lowest / Highest observed)
          </p>
          {summary.priceGroups.length > 0 ? (
            <>
              <div className="mt-2 space-y-2">
                {summary.priceGroups.map((group) => (
                  <PriceGroupBlock key={group.key} group={group} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Observed prices — specifications (including dimensions) may differ
                across offerings; no currency or unit conversion is applied.
              </p>
            </>
          ) : summary.unstructuredPriceCount > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              A price is recorded for {summary.unstructuredPriceCount} offering
              {summary.unstructuredPriceCount === 1 ? "" : "s"} but is not yet
              structured into a numeric amount, so no observed ranges are shown.
            </p>
          ) : summary.noPriceRecordedCount > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No public price was found for the offerings in this run.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No offerings are recorded yet.
            </p>
          )}
          {summary.unstructuredPriceCount > 0 &&
          summary.priceGroups.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.unstructuredPriceCount} offering
              {summary.unstructuredPriceCount === 1 ? "" : "s"} record a price
              without a numeric amount and are excluded from the ranges.
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Substitutes are never combined with exact matches.
          </p>
        </div>

        {summary.excludedFromPrices.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Excluded from price ranges
            </p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {summary.excludedFromPrices.map((entry) => (
                <li key={entry.reason}>
                  {entry.reason}: {entry.count}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Remaining research gaps
          </p>
          {gaps.present ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Coverage: {gaps.coveredCells} covered, {gaps.partialCells} partial,{" "}
              {gaps.gapCells} gap{gaps.gapCells === 1 ? "" : "s"} of{" "}
              {gaps.totalCells} recorded cells
              {gaps.pendingFollowUps > 0
                ? `; ${gaps.pendingFollowUps} pending follow-up${
                    gaps.pendingFollowUps === 1 ? "" : "s"
                  }.`
                : "."}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No checkpoint recorded, so coverage gaps are unavailable.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
