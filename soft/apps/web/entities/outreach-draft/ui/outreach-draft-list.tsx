import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@shared/lib/format";
import {
  languageLabel,
  missingFieldGuidance,
  OUTREACH_STATUS_LABEL,
  OUTREACH_STATUS_TONE,
  summarizeDrafts,
} from "../display";
import type { OutreachDraftRead } from "../types";

function DraftBlock({
  draft,
  productId,
}: {
  draft: OutreachDraftRead;
  productId: string;
}) {
  return (
    <li className="rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={OUTREACH_STATUS_TONE[draft.preparationStatus]}>
          {OUTREACH_STATUS_LABEL[draft.preparationStatus]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          v{draft.version} · {languageLabel(draft.language)} ·{" "}
          {formatDateTime(draft.createdAt)}
        </span>
      </div>

      {draft.inputsStale ? (
        <div className="mt-2 space-y-1">
          {draft.staleReasons.map((reason) => (
            <p key={reason} className="text-xs text-destructive">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-muted-foreground">
        Recipient: {draft.recipientEmail ?? "none selected"}
      </p>
      {draft.senderSnapshot ? (
        <p className="text-muted-foreground">
          Sender: {draft.senderSnapshot.senderName} ·{" "}
          {draft.senderSnapshot.companyName} · {draft.senderSnapshot.fromEmail}
        </p>
      ) : null}

      {draft.preparationStatus === "BLOCKED" ? (
        <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            To prepare this draft
          </p>
          <ul className="mt-1 space-y-1">
            {missingFieldGuidance(draft.missingFields, productId).map((item) => (
              <li key={item.key} className="text-foreground">
                {item.label}: {item.hint}{" "}
                <Link
                  href={item.href}
                  className="rounded text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Subject
          </p>
          <p className="text-foreground">{draft.subject}</p>
          <details className="group">
            <summary className="cursor-pointer rounded text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              View draft
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded border border-border p-3 font-sans text-foreground">
              {draft.body}
            </pre>
          </details>
        </div>
      )}

      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>{draft.recipientRationale}</p>
        <p>{draft.rationale}</p>
        {draft.contextVersion !== null ? (
          <p>Context v{draft.contextVersion}</p>
        ) : null}
      </div>
    </li>
  );
}

export function OutreachDraftList({
  productId,
  drafts,
  unavailable = false,
}: {
  productId: string;
  drafts: OutreachDraftRead[];
  unavailable?: boolean;
}) {
  const summary = summarizeDrafts(drafts);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach draft</CardTitle>
        <CardDescription>
          A prepared initial email with its rationale. Sending is not available
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unavailable ? (
          <p className="text-sm text-muted-foreground">
            Outreach drafts could not be loaded right now.
          </p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outreach draft prepared yet.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {summary.total} draft{summary.total === 1 ? "" : "s"} ·{" "}
              {summary.prepared} prepared · {summary.blocked} blocked
              {summary.stale > 0 ? ` · ${summary.stale} stale` : ""}
            </p>
            <ul className="space-y-3">
              {drafts.map((draft) => (
                <DraftBlock key={draft.id} draft={draft} productId={productId} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
