import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OfferingsTable } from "./offerings-table";
import { cn } from "@shared/lib/utils";
import {
  filterOfferings,
  offeringFilterHref,
  offeringFilterOptions,
  MATCH_TYPE_LABEL,
  type OfferingFilters,
} from "@/lib/research/offerings";
import { buildOfferingTableGroups } from "@/lib/research/offerings-table";
import type { ClaimFilters } from "@/lib/research/claims";
import type { ClaimRead, EvidenceRead, OfferingRead } from "@/lib/research/types";

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function OfferingsView({
  offerings,
  claims,
  evidence,
  filters,
  claimFilters,
  basePath,
}: {
  offerings: OfferingRead[];
  /** All claims (current + history) so a corrected link can be flagged. */
  claims: ClaimRead[];
  evidence: EvidenceRead[];
  filters: OfferingFilters;
  claimFilters: ClaimFilters;
  basePath: string;
}) {
  const options = offeringFilterOptions(offerings);
  const filtered = filterOfferings(offerings, filters);

  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const tableGroups = buildOfferingTableGroups(
    filtered,
    claimsById,
    evidenceById,
  );

  const preservedClaims = {
    type: claimFilters.type,
    confidence: claimFilters.confidence,
    stance: claimFilters.stance,
    history: claimFilters.history,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies and offerings</CardTitle>
        <CardDescription>
          One row per recorded supplier offering, with provenance. Exact
          matches, adjacent products and substitutes are kept separate; an
          unrecorded field is shown as unknown, never guessed. Select a row for
          the full specification, price wording, evidence and uncertainty.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {offerings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No offerings are recorded for this run yet.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Market served:</span>
                <FilterChip
                  href={offeringFilterHref(
                    basePath,
                    { ...filters, market: undefined },
                    preservedClaims,
                  )}
                  active={!filters.market}
                >
                  All
                </FilterChip>
                {options.markets.map((market) => (
                  <FilterChip
                    key={market}
                    href={offeringFilterHref(
                      basePath,
                      { ...filters, market },
                      preservedClaims,
                    )}
                    active={filters.market === market}
                  >
                    {market}
                  </FilterChip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Application:</span>
                <FilterChip
                  href={offeringFilterHref(
                    basePath,
                    { ...filters, application: undefined },
                    preservedClaims,
                  )}
                  active={!filters.application}
                >
                  All
                </FilterChip>
                {options.applications.map((application) => (
                  <FilterChip
                    key={application}
                    href={offeringFilterHref(
                      basePath,
                      { ...filters, application },
                      preservedClaims,
                    )}
                    active={filters.application === application}
                  >
                    {application}
                  </FilterChip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Match:</span>
                <FilterChip
                  href={offeringFilterHref(
                    basePath,
                    { ...filters, matchType: undefined },
                    preservedClaims,
                  )}
                  active={!filters.matchType}
                >
                  All
                </FilterChip>
                {options.matchTypes.map((matchType) => (
                  <FilterChip
                    key={matchType}
                    href={offeringFilterHref(
                      basePath,
                      { ...filters, matchType },
                      preservedClaims,
                    )}
                    active={filters.matchType === matchType}
                  >
                    {MATCH_TYPE_LABEL[matchType]}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Showing {filtered.length} of {offerings.length} offerings
              </span>
              {filters.market || filters.application || filters.matchType ? (
                <Link
                  href={basePath}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Clear filters
                </Link>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No offerings match the active filters.
              </p>
            ) : (
              <OfferingsTable groups={tableGroups} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
