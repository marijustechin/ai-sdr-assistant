import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LeadStatusBadge } from "./lead-status-badge";
import {
  leadDetailPath,
  leadRoleLabel,
  opportunityCountries,
  partitionOpportunities,
  summarizeLeads,
} from "@/lib/leads/display";
import type { LeadRead } from "@/lib/leads/types";
import type { OpportunityRead } from "@/lib/research/types";

function websiteHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function CountriesLine({ opportunity }: { opportunity: OpportunityRead }) {
  const countries = opportunityCountries(opportunity);
  return (
    <p className="text-xs text-muted-foreground">
      {countries.length > 0
        ? `Countries: ${countries.join(", ")}`
        : "Countries: none recorded"}
    </p>
  );
}

function LeadRow({ productId, lead }: { productId: string; lead: LeadRead }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-border px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{lead.company.name}</span>
        {lead.company.country ? (
          <span className="text-muted-foreground">{lead.company.country}</span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {lead.observedRoles.map(leadRoleLabel).join(", ")}
        </span>
        {websiteHost(lead.company.website) ? (
          <span className="text-xs text-muted-foreground">
            {websiteHost(lead.company.website)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {lead.needsReview ? <Badge tone="warning">Needs review</Badge> : null}
        <LeadStatusBadge status={lead.reviewStatus} />
        <Link
          href={leadDetailPath(productId, lead.opportunityId, lead.id)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer",
          )}
        >
          View details
        </Link>
      </div>
    </li>
  );
}

function OpportunityLeadsBlock({
  productId,
  opportunity,
  leads,
}: {
  productId: string;
  opportunity: OpportunityRead;
  leads: LeadRead[];
}) {
  const summary = summarizeLeads(leads);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{opportunity.name}</CardTitle>
        <CardDescription>
          {opportunity.objective ?? "No objective recorded."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CountriesLine opportunity={opportunity} />
        <p className="text-xs text-muted-foreground">
          {summary.total} candidate{summary.total === 1 ? "" : "s"} ·{" "}
          {summary.unreviewed} unreviewed · {summary.shortlisted} shortlisted ·{" "}
          {summary.rejected} rejected
          {summary.needingReview > 0
            ? ` · ${summary.needingReview} needing review`
            : ""}
        </p>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No potential buyers recorded for this opportunity yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {leads.map((lead) => (
              <LeadRow key={lead.id} productId={productId} lead={lead} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function LeadsList({
  productId,
  opportunities,
  leadsByOpportunityId,
}: {
  productId: string;
  opportunities: OpportunityRead[];
  leadsByOpportunityId: Map<string, LeadRead[]>;
}) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            No opportunity is recorded for this product yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { withCandidates, withoutCandidates } = partitionOpportunities(
    opportunities,
    leadsByOpportunityId,
  );

  return (
    <div className="space-y-4">
      {withCandidates.map((opportunity) => (
        <OpportunityLeadsBlock
          key={opportunity.id}
          productId={productId}
          opportunity={opportunity}
          leads={leadsByOpportunityId.get(opportunity.id) ?? []}
        />
      ))}

      {withoutCandidates.length > 0 ? (
        <details className="group rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-t-xl p-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <span>
              Opportunities without candidates ({withoutCandidates.length})
            </span>
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">
              Show
            </span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">
              Hide
            </span>
          </summary>
          <div className="space-y-4 p-5 pt-0">
            {withoutCandidates.map((opportunity) => (
              <OpportunityLeadsBlock
                key={opportunity.id}
                productId={productId}
                opportunity={opportunity}
                leads={[]}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
