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
import {
  getOutreachBatch,
  listOutreachBatches,
} from "@entities/outreach-batch/api";
import {
  OUTREACH_BATCH_STATUS_LABEL,
  OUTREACH_BATCH_STATUS_TONE,
  type OutreachBatchRead,
  type OutreachBatchSummaryRead,
} from "@entities/outreach-batch";
import { listSenderProfiles } from "@entities/sender-profile/api";
import { formatDateTime } from "@shared/lib/format";
import type { OpportunityRead } from "@/lib/research/types";
import {
  approveOutreachBatchAction,
  createOutreachBatchAction,
  regenerateOutreachBatchAction,
} from "./actions";

function CountsLine({ summary }: { summary: OutreachBatchSummaryRead }) {
  const c = summary.counts;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>
        Eligible: <span className="text-foreground">{c.eligibleLeads}</span>
      </span>
      <span>
        Generated: <span className="text-foreground">{c.generatedDrafts}</span>
      </span>
      <span>
        Approved: <span className="text-foreground">{c.approvedDrafts}</span>
      </span>
      <span>
        Pending: <span className="text-foreground">{c.pendingDrafts}</span>
      </span>
      <span>
        Excluded by human decision:{" "}
        <span className="text-foreground">{c.excludedByDecision}</span>
      </span>
      <span>
        Without usable recipient:{" "}
        <span className="text-foreground">{c.withoutRecipient}</span>
      </span>
    </div>
  );
}

function BatchBlock({
  productId,
  opportunity,
  summary,
  senderLabel,
}: {
  productId: string;
  opportunity: OpportunityRead;
  summary: OutreachBatchSummaryRead | null;
  senderLabel: string | null;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{opportunity.name}</span>
        {summary ? (
          <>
            <Badge tone={OUTREACH_BATCH_STATUS_TONE[summary.batch.status]}>
              {OUTREACH_BATCH_STATUS_LABEL[summary.batch.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {summary.batch.language.toUpperCase()}
              {summary.batch.approvedAt
                ? ` · approved ${formatDateTime(summary.batch.approvedAt)}`
                : ""}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            No batch generated yet
          </span>
        )}
      </div>

      {summary ? (
        <>
          <CountsLine summary={summary} />
          <p className="text-xs text-muted-foreground">
            Sender: {senderLabel ?? "not assigned"} · Product scope:{" "}
            {opportunity.name}
          </p>

          {summary.representative.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Representative drafts
              </p>
              <ul className="space-y-1">
                {summary.representative.map((preview) => (
                  <li key={preview.draftId} className="text-xs">
                    <span className="text-foreground">
                      {preview.subject ?? "(no subject)"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      → {preview.recipientEmail ?? "no recipient"}
                    </span>{" "}
                    <Link
                      href={`/products/${encodeURIComponent(productId)}/leads/${encodeURIComponent(opportunity.id)}/${encodeURIComponent(preview.leadId)}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      Open draft
                    </Link>
                    <p className="text-muted-foreground">
                      {preview.bodyExcerpt}…
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <form
              action={approveOutreachBatchAction.bind(
                null,
                opportunity.id,
                summary.batch.id,
                productId,
              )}
            >
              <Button type="submit" size="sm" className="cursor-pointer">
                Approve whole batch
              </Button>
            </form>
            <form
              action={regenerateOutreachBatchAction.bind(
                null,
                opportunity.id,
                summary.batch.id,
                productId,
              )}
            >
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="cursor-pointer"
              >
                Regenerate unapproved
              </Button>
            </form>
            <form
              action={createOutreachBatchAction.bind(
                null,
                opportunity.id,
                productId,
              )}
            >
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="cursor-pointer"
              >
                New batch
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground">
            Approval freezes the exact subject, body, HTML, recipient and sender
            snapshot of every included draft. Individual editing (on a lead) is
            optional and creates a new version that must be re-approved. Sending
            is not implemented yet.
          </p>
        </>
      ) : (
        <form
          action={createOutreachBatchAction.bind(null, opportunity.id, productId)}
        >
          <Button type="submit" size="sm" className="cursor-pointer">
            Generate batch for eligible leads
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * Batch/campaign review surface. Drafts are generated for all currently
 * eligible leads in the scope and approved as a whole; per-recipient approval is
 * not required. No sending.
 */
export async function OutreachBatchSection({
  productId,
  opportunities,
}: {
  productId: string;
  opportunities: OpportunityRead[];
}) {
  if (opportunities.length === 0) return null;

  let senderProfiles: Array<{ id: string; label: string }> = [];
  try {
    senderProfiles = (await listSenderProfiles()).map((profile) => ({
      id: profile.id,
      label: profile.label,
    }));
  } catch {
    senderProfiles = [];
  }

  const rows: Array<{
    opportunity: OpportunityRead;
    summary: OutreachBatchSummaryRead | null;
  }> = [];
  for (const opportunity of opportunities) {
    let summary: OutreachBatchSummaryRead | null = null;
    try {
      const batches: OutreachBatchRead[] = await listOutreachBatches(
        opportunity.id,
      );
      if (batches[0]) {
        summary = await getOutreachBatch(opportunity.id, batches[0].id);
      }
    } catch {
      summary = null;
    }
    rows.push({ opportunity, summary });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach batch</CardTitle>
        <CardDescription>
          Generate and approve outreach drafts for all eligible leads as one
          batch. Approval freezes the exact versions; individual editing is an
          optional exception. No sending yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map(({ opportunity, summary }) => (
          <BatchBlock
            key={opportunity.id}
            productId={productId}
            opportunity={opportunity}
            summary={summary}
            senderLabel={
              summary?.batch.senderProfileId
                ? (senderProfiles.find(
                    (p) => p.id === summary?.batch.senderProfileId,
                  )?.label ?? summary.batch.senderProfileId)
                : null
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
