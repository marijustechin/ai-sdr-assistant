import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BRIEF_FINDING_KIND_LABEL,
  type BriefContentRead,
  type BriefFindingRead,
  type BriefSourceRead,
  type CompanyBriefDetailRead,
} from "@entities/company-brief";
import { formatDateTime } from "@shared/lib/format";
import {
  refreshCompanyBriefAction,
  requestCompanyBriefEnrichmentAction,
} from "./actions";
import {
  briefPagePath,
  buildMeetingPrep,
  orderedSections,
  sourceLabel,
} from "./brief-view";

function kindBadgeClass(kind: BriefFindingRead["kind"]): string {
  const base =
    "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide";
  if (kind === "COMMERCIAL_HYPOTHESIS") {
    return `${base} border-amber-500/40 text-amber-700 dark:text-amber-300`;
  }
  if (kind === "RECENT_ENRICHMENT") {
    return `${base} border-sky-500/40 text-sky-700 dark:text-sky-300`;
  }
  return `${base} border-border text-muted-foreground`;
}

function statusBadgeClass(status: string): string {
  const base = "rounded border px-2 py-0.5 text-xs font-medium";
  if (status === "ENRICHED") {
    return `${base} border-emerald-500/40 text-emerald-700 dark:text-emerald-300`;
  }
  if (status === "ENRICHMENT_REQUESTED") {
    return `${base} border-sky-500/40 text-sky-700 dark:text-sky-300`;
  }
  return `${base} border-border text-muted-foreground`;
}

function SourceChips({ sources }: { sources: BriefSourceRead[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Sources:{" "}
      {sources.map((source, index) => {
        const title = `${source.url}${
          source.retrievedAt
            ? ` · retrieved ${source.retrievedAt.slice(0, 10)}`
            : ""
        }`;
        const isLink = /^https?:/i.test(source.url);
        return (
          <span key={`${source.url}-${index}`}>
            {index > 0 ? " · " : ""}
            {isLink ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                title={title}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {sourceLabel(source.url)}
              </a>
            ) : (
              <span title={title}>{sourceLabel(source.url)}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function FindingItem({ finding }: { finding: BriefFindingRead }) {
  return (
    <li className="space-y-1">
      <div className="flex items-start gap-2">
        <span className={kindBadgeClass(finding.kind)}>
          {BRIEF_FINDING_KIND_LABEL[finding.kind]}
        </span>
        <span className="text-sm text-foreground">{finding.statement}</span>
      </div>
      {finding.detail ? (
        <p className="text-sm text-muted-foreground">{finding.detail}</p>
      ) : null}
      {finding.sources && finding.sources.length > 0 ? (
        <SourceChips sources={finding.sources} />
      ) : null}
    </li>
  );
}

function StringItems({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SectionBody({
  sectionKey,
  content,
}: {
  sectionKey: keyof BriefContentRead;
  content: BriefContentRead;
}) {
  const value = content[sectionKey];
  if (typeof value === "string") {
    return <StringItems items={[value]} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted-foreground">—</p>;
    }
    if (typeof value[0] === "string") {
      return <StringItems items={value as string[]} />;
    }
    return (
      <ul className="space-y-2">
        {(value as BriefFindingRead[]).map((finding, index) => (
          <FindingItem key={`${sectionKey}-${index}`} finding={finding} />
        ))}
      </ul>
    );
  }
  return null;
}

function PrepRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[190px_1fr] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function BriefActions({
  detail,
  productId,
}: {
  detail: CompanyBriefDetailRead;
  productId: string;
}) {
  const opportunityId = detail.brief.opportunityId;
  const companyId = detail.brief.companyId;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={refreshCompanyBriefAction.bind(
          null,
          opportunityId,
          companyId,
          productId,
        )}
      >
        <Button type="submit" size="sm" variant="secondary" className="cursor-pointer">
          Refresh
        </Button>
      </form>
      <form
        action={requestCompanyBriefEnrichmentAction.bind(
          null,
          opportunityId,
          companyId,
          productId,
        )}
      >
        <Button type="submit" size="sm" variant="ghost" className="cursor-pointer">
          Request enrichment
        </Button>
      </form>
    </div>
  );
}

/**
 * The full Company Brief as a readable working document: meeting-prep summary,
 * then the structured sections. A read/prepare workspace — the sole actions are
 * Refresh and Request enrichment.
 */
export function CompanyBriefDocument({
  detail,
  productId,
}: {
  detail: CompanyBriefDetailRead;
  productId: string;
}) {
  const content = detail.latest.content;
  const prep = buildMeetingPrep(content);
  const sections = orderedSections();

  return (
    <article className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {detail.companyName}
          </h1>
          <span className={statusBadgeClass(detail.latest.status)}>
            {detail.latest.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Company brief · {detail.offerName ?? "Offer context unavailable"}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div>
            <dt className="inline">Version </dt>
            <dd className="inline text-foreground">v{detail.latest.version}</dd>
          </div>
          <div>
            <dt className="inline">Prepared </dt>
            <dd className="inline text-foreground">
              {formatDateTime(detail.latest.preparedAt)}
            </dd>
          </div>
          <div>
            <dt className="inline">Last refreshed </dt>
            <dd className="inline text-foreground">
              {formatDateTime(detail.latest.lastRefreshedAt)}
            </dd>
          </div>
          <div>
            <dt className="inline">Sources </dt>
            <dd className="inline text-foreground">{detail.latest.sourceCount}</dd>
          </div>
          <div>
            <dt className="inline">Snapshots </dt>
            <dd className="inline text-foreground">{detail.history.length}</dd>
          </div>
        </dl>
        <BriefActions detail={detail} productId={productId} />
        <p className="text-xs text-muted-foreground">
          <span className={kindBadgeClass("KNOWN_FACT")}>Known fact</span> directly
          evidenced · <span className={kindBadgeClass("RECENT_ENRICHMENT")}>
            Recent enrichment
          </span>{" "}
          newly sourced ·{" "}
          <span className={kindBadgeClass("COMMERCIAL_HYPOTHESIS")}>
            Commercial hypothesis
          </span>{" "}
          inference, not fact.
        </p>
      </header>

      <section
        aria-labelledby="meeting-prep"
        className="rounded-lg border border-border bg-muted/20 p-4"
      >
        <h2
          id="meeting-prep"
          className="text-sm font-semibold uppercase tracking-wide text-foreground"
        >
          Before the meeting
        </h2>
        <dl className="mt-3 space-y-3">
          <PrepRow label="What they do" value={prep.whatTheyDo} />
          <PrepRow label="Why this account may fit" value={prep.whyFit} />
          <PrepRow label="Who replied / key contact" value={prep.keyContact} />
          <PrepRow label="Relationship state" value={prep.relationship} />
          <PrepRow label="Size / financial signal" value={prep.sizeSignal} />
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-[190px_1fr] sm:gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Important unknowns
            </dt>
            <dd>
              <StringItems items={prep.unknowns} />
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-[190px_1fr] sm:gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommended questions
            </dt>
            <dd>
              <StringItems items={prep.questions} />
            </dd>
          </div>
        </dl>
      </section>

      {sections.map(({ key, label }) => (
        <section key={key} className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">{label}</h2>
          <SectionBody sectionKey={key} content={content} />
        </section>
      ))}

      <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
        Snapshot history:{" "}
        {detail.history
          .map((snapshot) => `v${snapshot.version} ${snapshot.status}`)
          .join(" · ")}{" "}
        ·{" "}
        <Link
          href={briefPagePath(productId, detail.brief.id)}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Permalink
        </Link>
      </footer>
    </article>
  );
}
