"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@shared/lib/format";
import {
  CLARIFICATION_STATE_LABEL,
  CLARIFICATION_STATE_TONE,
  type ResearchResultRead,
} from "@/lib/research/result";
import {
  finalizeResearchResultAction,
  runDueFollowUpsAction,
} from "@features/manage-research-result";

/**
 * Minimal research-result presentation: completion/enrichment timestamps,
 * summary counts and the per-inquiry clarification state. Finalize and the
 * manual "check due" action are explicit human actions; nothing is sent.
 */
export function ResearchResultSummary({
  productId,
  opportunityId,
  runId,
  runStatus,
  result,
}: {
  productId: string;
  opportunityId: string;
  runId: string;
  runStatus: string;
  result: ResearchResultRead;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canFinalize = runStatus === "RUNNING" || runStatus === "PAUSED";

  async function run(
    action: () => Promise<{ ok: boolean; message: string }>,
  ) {
    setBusy(true);
    setMessage(null);
    const res = await action();
    setMessage(res.message);
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Research result</CardTitle>
        <CardDescription>
          Publishable even while supplier clarifications are pending. Later
          replies enrich this result without rewriting history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-4">
          <span>
            <span className="text-muted-foreground">Research completed: </span>
            {result.researchCompletedAt
              ? formatDateTime(result.researchCompletedAt)
              : "not finalized"}
          </span>
          <span>
            <span className="text-muted-foreground">Last updated: </span>
            {result.lastEnrichedAt
              ? formatDateTime(result.lastEnrichedAt)
              : "—"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="outline">Public prices: {result.counts.publicPriceObservations}</Badge>
          <Badge tone="warning">Pending clarification: {result.counts.pendingClarifications}</Badge>
          <Badge tone="info">Replies (no price): {result.counts.repliesReceived}</Badge>
          <Badge tone="success">Quotes received: {result.counts.quotesReceived}</Badge>
          <Badge tone="neutral">No response: {result.counts.noResponseInquiries}</Badge>
          <Badge tone="info">Sellers: {result.counts.currentSellers}</Badge>
          <Badge tone="info">Potential buyers: {result.counts.potentialBuyers}</Badge>
        </div>

        {result.inquiries.length > 0 ? (
          <ul className="space-y-2">
            {result.inquiries.map((inquiry) => (
              <li
                key={inquiry.draftId}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={CLARIFICATION_STATE_TONE[inquiry.clarificationState]}>
                    {CLARIFICATION_STATE_LABEL[inquiry.clarificationState]}
                  </Badge>
                  <span className="font-medium">{inquiry.companyName}</span>
                  <span className="text-muted-foreground">{inquiry.productName}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inquiry.recipientEmail ?? "no recipient"}
                  {inquiry.quotePriceText
                    ? ` · quote: ${inquiry.quotePriceText} ${inquiry.quoteCurrency ?? ""}`
                    : ""}
                  {inquiry.nextCheckAt
                    ? ` · next check ${formatDateTime(inquiry.nextCheckAt)}`
                    : ""}
                  {inquiry.lastCheckedAt
                    ? ` · last checked ${formatDateTime(inquiry.lastCheckedAt)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No sent inquiries to track.</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {canFinalize ? (
            <Button
              type="button"
              disabled={busy}
              className="cursor-pointer"
              onClick={() =>
                run(() =>
                  finalizeResearchResultAction(productId, opportunityId, runId),
                )
              }
            >
              Finalize result
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="cursor-pointer"
            onClick={() =>
              run(() =>
                runDueFollowUpsAction(productId, opportunityId, runId),
              )
            }
          >
            Check due inquiries now
          </Button>
          {message ? <span className="text-xs">{message}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
