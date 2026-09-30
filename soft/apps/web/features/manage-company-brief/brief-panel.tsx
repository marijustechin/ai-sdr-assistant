import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BRIEF_FINDING_KIND_LABEL,
  BRIEF_SECTION_LABEL,
  type BriefContentRead,
  type BriefFindingRead,
  type CompanyBriefViewRead,
} from "@entities/company-brief";
import { formatDateTime } from "@shared/lib/format";
import {
  refreshCompanyBriefAction,
  requestCompanyBriefEnrichmentAction,
} from "./actions";

const FINDING_SECTIONS: Array<keyof BriefContentRead> = [
  "companyOverview",
  "relevantProductsOperations",
  "whyThisAccountFits",
  "existingRelationshipOutreach",
  "keyPeopleContacts",
  "financialSizeSignals",
  "marketsCustomersChannels",
  "recentActivity",
  "reputationPublicFeedback",
  "commercialHypotheses",
  "thingsToKnowBeforeMeeting",
];

function FindingBlock({ finding }: { finding: BriefFindingRead }) {
  const tone =
    finding.kind === "COMMERCIAL_HYPOTHESIS"
      ? "warning"
      : finding.kind === "RECENT_ENRICHMENT"
        ? "info"
        : "outline";
  return (
    <li className="space-y-0.5">
      <span>{finding.statement}</span>{" "}
      <Badge tone={tone}>{BRIEF_FINDING_KIND_LABEL[finding.kind]}</Badge>
      {finding.detail ? (
        <p className="text-muted-foreground">{finding.detail}</p>
      ) : null}
      {finding.sources && finding.sources.length > 0 ? (
        <p className="text-muted-foreground">
          {finding.sources.map((source) => source.url).join(" · ")}
        </p>
      ) : null}
    </li>
  );
}

function StringList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-muted-foreground">—</p>;
  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Company brief (account intelligence) for a positive handoff. Read-only summary
 * of the latest snapshot + Refresh / Request enrichment actions. Facts, recent
 * enrichment and commercial hypotheses stay labelled; nothing here researches the
 * web or sends email.
 */
export function CompanyBriefPanel({
  view,
  opportunityId,
  productId,
}: {
  view: CompanyBriefViewRead;
  opportunityId: string;
  productId: string;
}) {
  const content = view.latest.content;
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Badge
          tone={view.latest.status === "ENRICHED" ? "success" : "info"}
        >
          {view.latest.status}
        </Badge>
        <span>v{view.latest.version}</span>
        <span>Prepared {formatDateTime(view.latest.preparedAt)}</span>
        <span>Refreshed {formatDateTime(view.latest.lastRefreshedAt)}</span>
        <span>{view.latest.sourceCount} source(s)</span>
        <span>{view.history.length} snapshot(s)</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <form
          action={refreshCompanyBriefAction.bind(
            null,
            opportunityId,
            view.brief.companyId,
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
            view.brief.companyId,
            productId,
          )}
        >
          <Button type="submit" size="sm" variant="ghost" className="cursor-pointer">
            Request enrichment
          </Button>
        </form>
      </div>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {BRIEF_SECTION_LABEL.atAGlance}
        </h4>
        <StringList items={content.atAGlance} />
      </section>

      {FINDING_SECTIONS.map((key) => {
        const findings = content[key] as BriefFindingRead[];
        if (findings.length === 0) return null;
        return (
          <section key={key}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {BRIEF_SECTION_LABEL[key]}
            </h4>
            <ul className="space-y-1">
              {findings.map((finding, index) => (
                <FindingBlock key={`${key}-${index}`} finding={finding} />
              ))}
            </ul>
          </section>
        );
      })}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {BRIEF_SECTION_LABEL.questionsWorthAsking}
        </h4>
        <StringList items={content.questionsWorthAsking} />
      </section>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {BRIEF_SECTION_LABEL.unknownsGaps}
        </h4>
        <StringList items={content.unknownsGaps} />
      </section>
    </div>
  );
}
