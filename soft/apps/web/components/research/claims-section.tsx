import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ClaimTypeBadge,
  ConfidenceBadge,
  LifecycleBadge,
  StanceBadge,
  VerificationBadge,
} from "./badges";
import {
  buildClaimViews,
  claimFilterHref,
  LIFECYCLE_LABEL,
  type ClaimFilters,
  type ClaimView,
  type PreservedOfferingFilters,
} from "@/lib/research/claims";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClaimRead, EvidenceRead } from "@/lib/research/types";

type Mode = "current" | "history";

const FILTER_TYPES = ["FACT", "INFERENCE", "UNKNOWN"] as const;
const FILTER_CONFIDENCES = ["HIGH", "MEDIUM", "LOW"] as const;
const FILTER_STANCES = ["SUPPORTS", "REFUTES", "CONTEXT"] as const;

function FilterLink({
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

function FilterRow({
  mode,
  filters,
  basePath,
  preserve,
}: {
  mode: Mode;
  filters: ClaimFilters;
  basePath: string;
  preserve: PreservedOfferingFilters;
}) {
  const withHistory = (next: ClaimFilters): ClaimFilters =>
    mode === "history" ? { ...next, history: true } : next;
  const href = (next: ClaimFilters): string =>
    claimFilterHref(basePath, withHistory(next), preserve);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Filter:</span>
      <FilterLink
        href={href({})}
        active={!filters.type && !filters.confidence && !filters.stance}
      >
        All
      </FilterLink>
      {FILTER_TYPES.map((type) => (
        <FilterLink
          key={type}
          href={href({ ...filters, type })}
          active={filters.type === type}
        >
          {type}
        </FilterLink>
      ))}
      {FILTER_CONFIDENCES.map((confidence) => (
        <FilterLink
          key={confidence}
          href={href({ ...filters, confidence })}
          active={filters.confidence === confidence}
        >
          {confidence}
        </FilterLink>
      ))}
      {FILTER_STANCES.map((stance) => (
        <FilterLink
          key={stance}
          href={href({ ...filters, stance })}
          active={filters.stance === stance}
        >
          {stance}
        </FilterLink>
      ))}
      {mode === "history" ? (
        <Link
          href={claimFilterHref(basePath, {}, preserve)}
          className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to current findings
        </Link>
      ) : (
        <Link
          href={claimFilterHref(basePath, { ...filters, history: true }, preserve)}
          className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Show correction history →
        </Link>
      )}
    </div>
  );
}

function ClaimCard({ view, mode }: { view: ClaimView; mode: Mode }) {
  const { claim, evidence } = view;
  return (
    <li
      id={`claim-${claim.id}`}
      className="scroll-mt-24 rounded-lg border border-border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ClaimTypeBadge type={claim.type} />
        <ConfidenceBadge confidence={claim.confidence} />
        {mode === "history" ? (
          <LifecycleBadge status={claim.lifecycleStatus} />
        ) : null}
      </div>

      <p className="mt-3 text-sm text-foreground">{claim.statement}</p>

      {claim.lifecycleStatus !== "CURRENT" ? (
        <div className="mt-3 rounded-md bg-muted p-3 text-sm">
          <p className="font-medium text-foreground">
            {LIFECYCLE_LABEL[claim.lifecycleStatus]}
            {claim.correctedAt
              ? ` · ${formatDateTime(claim.correctedAt)}`
              : ""}
          </p>
          {claim.correctionReason ? (
            <p className="mt-1 text-muted-foreground">
              Reason: {claim.correctionReason}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              No correction reason recorded.
            </p>
          )}
          {claim.replacedByClaimId ? (
            <p className="mt-1">
              Replaced by{" "}
              <a
                href={`#claim-${claim.replacedByClaimId}`}
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
              >
                {claim.replacedByClaimId}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Evidence ({evidence.length})
        </p>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No evidence is linked to this claim.
          </p>
        ) : (
          <ul className="space-y-2">
            {evidence.map(({ link, evidence: item }) => (
              <li
                key={link.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                {item ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <StanceBadge stance={link.stance} />
                      <VerificationBadge status={item.verificationStatus} />
                      <span className="text-xs text-muted-foreground">
                        Retrieved {formatDateTime(item.retrievedAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {item.evidenceText}
                    </p>
                    <p className="mt-2 text-xs">
                      Source:{" "}
                      <a
                        href={item.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-primary underline-offset-2 hover:underline"
                      >
                        {item.source.title ?? item.source.url}
                      </a>
                    </p>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <StanceBadge stance={link.stance} />
                    <span className="text-muted-foreground">
                      Evidence record {link.evidenceId} is not present in this
                      run&apos;s evidence list.
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function ClaimsSection({
  mode,
  claims,
  evidence,
  filters,
  basePath,
  title,
  description,
  preserveOfferingFilters,
}: {
  mode: Mode;
  claims: ClaimRead[];
  evidence: EvidenceRead[];
  filters: ClaimFilters;
  basePath: string;
  title?: string;
  description?: string;
  preserveOfferingFilters?: PreservedOfferingFilters;
}) {
  const views = buildClaimViews(claims, evidence);
  const heading =
    title ?? (mode === "history" ? "Correction history" : "Findings (current)");
  const subheading =
    description ??
    (mode === "history"
      ? "All claims including retracted and replaced records (includeHistory=true). Historical claims are never shown as current findings."
      : "Current claims only. Retracted and replaced claims are in the correction history.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{subheading}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterRow
          mode={mode}
          filters={filters}
          basePath={basePath}
          preserve={preserveOfferingFilters ?? {}}
        />
        {views.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No claims match the current filters.
          </p>
        ) : (
          <ul className="space-y-3">
            {views.map((view) => (
              <ClaimCard key={view.claim.id} view={view} mode={mode} />
            ))}
          </ul>
        )}
        {mode === "history" ? (
          <p className="text-xs text-muted-foreground">
            Current / replaced / retracted lifecycle is recorded separately from
            claim type and evidence verification.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
