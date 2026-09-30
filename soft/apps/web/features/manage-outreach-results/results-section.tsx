import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listOutreachBatches } from "@entities/outreach-batch/api";
import type { OutreachBatchRead } from "@entities/outreach-batch";
import { getOutreachResults } from "@entities/outreach-result/api";
import { getCompanyBrief } from "@entities/company-brief/api";
import type { CompanyBriefViewRead } from "@entities/company-brief";
import {
  briefPagePath,
  buildBriefSummary,
  prepareCompanyBriefAction,
  refreshCompanyBriefAction,
  requestCompanyBriefEnrichmentAction,
} from "@features/manage-company-brief";
import {
  OUTREACH_CLASSIFICATION_LABEL,
  OUTREACH_CLASSIFICATION_TONE,
  isPositiveClassification,
  type OutreachBatchResultsRead,
  type OutreachReplyClassification,
} from "@entities/outreach-result";
import { formatDateTime } from "@shared/lib/format";
import type { OpportunityRead } from "@/lib/research/types";
import {
  overrideOutreachReplyAction,
  scanOutreachResultsAction,
} from "./actions";

const CLASSIFICATIONS: OutreachReplyClassification[] = [
  "INTERESTED",
  "PRICE_REQUEST",
  "MORE_INFO",
  "NOT_INTERESTED",
  "WRONG_CONTACT",
  "OUT_OF_OFFICE",
  "OTHER",
];

function Counters({ counts }: { counts: OutreachBatchResultsRead["counts"] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>Sent: <span className="text-foreground">{counts.sent}</span></span>
      <span>Replies: <span className="text-foreground">{counts.replies}</span></span>
      <span>Positive: <span className="text-foreground">{counts.positiveReplies}</span></span>
      <span>Negative: <span className="text-foreground">{counts.negativeReplies}</span></span>
      <span>No response: <span className="text-foreground">{counts.noResponse}</span></span>
      <span>
        Human follow-up required:{" "}
        <span className="text-foreground">{counts.humanFollowUpRequired}</span>
      </span>
    </div>
  );
}

/**
 * Outreach results / campaign summary: per-batch reply counts and a result table
 * (company, recipient, sent at, reply status, outcome, human action, notes).
 * Positive replies show an excerpt + a "Requires human follow-up" badge and can
 * be reclassified by a human. Nothing here sends a follow-up.
 */
function BriefSummaryCell({
  view,
  opportunityId,
  productId,
}: {
  view: CompanyBriefViewRead;
  opportunityId: string;
  productId: string;
}) {
  const summary = buildBriefSummary(view);
  const companyId = view.brief.companyId;
  return (
    <div className="w-64 space-y-1">
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Badge tone={view.latest.status === "ENRICHED" ? "success" : "info"}>
          {summary.status}
        </Badge>
        <span>v{summary.version}</span>
        <span>· {summary.sourceCount} source(s)</span>
        <span>· refreshed {formatDateTime(summary.lastRefreshedAt)}</span>
      </div>
      {summary.points.length > 0 ? (
        <ul className="list-disc pl-4 text-xs text-muted-foreground">
          {summary.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={briefPagePath(productId, view.brief.id)}
          className="text-xs font-medium text-primary underline underline-offset-2 hover:underline"
        >
          Open full brief
        </Link>
        <form
          action={refreshCompanyBriefAction.bind(
            null,
            opportunityId,
            companyId,
            productId,
          )}
        >
          <Button type="submit" size="sm" variant="ghost" className="h-6 cursor-pointer px-1 text-xs">
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
          <Button type="submit" size="sm" variant="ghost" className="h-6 cursor-pointer px-1 text-xs">
            Request enrichment
          </Button>
        </form>
      </div>
    </div>
  );
}

export async function OutreachResultsSection({
  productId,
  opportunities,
}: {
  productId: string;
  opportunities: OpportunityRead[];
}) {
  if (opportunities.length === 0) return null;

  const groups: Array<{
    opportunity: OpportunityRead;
    entries: Array<{
      batch: OutreachBatchRead;
      results: OutreachBatchResultsRead;
      briefs: Map<string, CompanyBriefViewRead | null>;
    }>;
  }> = [];

  for (const opportunity of opportunities) {
    let batches: OutreachBatchRead[] = [];
    try {
      batches = await listOutreachBatches(opportunity.id);
    } catch {
      batches = [];
    }
    const entries: Array<{
      batch: OutreachBatchRead;
      results: OutreachBatchResultsRead;
      briefs: Map<string, CompanyBriefViewRead | null>;
    }> = [];
    for (const batch of batches) {
      try {
        const results = await getOutreachResults(opportunity.id, batch.id);
        if (results.counts.sent === 0) continue;
        const briefs = new Map<string, CompanyBriefViewRead | null>();
        for (const row of results.rows) {
          if (!isPositiveClassification(row.outcome)) continue;
          if (briefs.has(row.companyId)) continue;
          try {
            briefs.set(
              row.companyId,
              await getCompanyBrief(opportunity.id, row.companyId),
            );
          } catch {
            briefs.set(row.companyId, null);
          }
        }
        entries.push({ batch, results, briefs });
      } catch {
        /* batch without results yet */
      }
    }
    if (entries.length > 0) groups.push({ opportunity, entries });
  }

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach results</CardTitle>
        <CardDescription>
          Replies to sent outreach, correlated by Message-ID / References and
          classified into a bounded set. Positive replies hand off to a human;
          the assistant never sends a follow-up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map(({ opportunity, entries }) => (
          <div key={opportunity.id} className="space-y-4">
            <p className="text-sm font-semibold">{opportunity.name}</p>
            {entries.map(({ batch, results, briefs }) => (
              <div key={batch.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{batch.id.slice(0, 8)}
                  </span>
                  <Badge tone={batch.status === "SENT" ? "success" : "info"}>
                    {batch.status}
                  </Badge>
                  <form
                    action={scanOutreachResultsAction.bind(
                      null,
                      opportunity.id,
                      batch.id,
                      productId,
                    )}
                  >
                    <Button type="submit" size="sm" variant="secondary" className="cursor-pointer">
                      Scan for replies
                    </Button>
                  </form>
                </div>
                <Counters counts={results.counts} />

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3">Company</th>
                        <th className="py-1 pr-3">Recipient</th>
                        <th className="py-1 pr-3">Sent at</th>
                        <th className="py-1 pr-3">Reply status</th>
                        <th className="py-1 pr-3">Outcome</th>
                        <th className="py-1 pr-3">Human action</th>
                        <th className="py-1 pr-3">Notes</th>
                        <th className="py-1 pr-3">Company brief</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows.map((row) => (
                        <tr key={row.outboundMessageId} className="border-t border-border align-top">
                          <td className="py-2 pr-3 text-foreground">{row.companyName}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{row.recipientEmail}</td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {row.sentAt ? formatDateTime(row.sentAt) : "—"}
                          </td>
                          <td className="py-2 pr-3">
                            {row.replyStatus === "REPLIED" ? "Replied" : "No response"}
                          </td>
                          <td className="py-2 pr-3">
                            {row.outcome ? (
                              <Badge tone={OUTREACH_CLASSIFICATION_TONE[row.outcome]}>
                                {OUTREACH_CLASSIFICATION_LABEL[row.outcome]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {row.classificationSource === "HUMAN" ? (
                              <span className="ml-1 text-muted-foreground">(override)</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3">
                            {isPositiveClassification(row.outcome) ? (
                              <Badge tone="success">Requires human follow-up</Badge>
                            ) : (
                              <span className="text-muted-foreground">{row.humanAction}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {isPositiveClassification(row.outcome) && row.excerpt ? (
                              <p className="max-w-xs">{row.excerpt}</p>
                            ) : (
                              row.notes ?? "—"
                            )}
                            {row.replyId ? (
                              <form
                                action={overrideOutreachReplyAction.bind(
                                  null,
                                  opportunity.id,
                                  batch.id,
                                  row.replyId,
                                  productId,
                                )}
                                className="mt-1 flex flex-wrap items-center gap-1"
                              >
                                <select
                                  name="classification"
                                  defaultValue={row.outcome ?? "OTHER"}
                                  className="rounded-md border border-border bg-background px-1 py-0.5 text-xs text-foreground"
                                >
                                  {CLASSIFICATIONS.map((value) => (
                                    <option key={value} value={value}>
                                      {OUTREACH_CLASSIFICATION_LABEL[value]}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name="note"
                                  placeholder="note (optional)"
                                  className="w-32 rounded-md border border-border bg-background px-1 py-0.5 text-xs text-foreground"
                                />
                                <Button type="submit" size="sm" variant="ghost" className="cursor-pointer">
                                  Override
                                </Button>
                              </form>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3">
                            {isPositiveClassification(row.outcome) ? (
                              briefs.get(row.companyId) ? (
                                <BriefSummaryCell
                                  view={briefs.get(row.companyId)!}
                                  opportunityId={opportunity.id}
                                  productId={productId}
                                />
                              ) : (
                                <form
                                  action={prepareCompanyBriefAction.bind(
                                    null,
                                    opportunity.id,
                                    row.companyId,
                                    productId,
                                  )}
                                >
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="secondary"
                                    className="cursor-pointer"
                                  >
                                    Prepare company brief
                                  </Button>
                                </form>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
