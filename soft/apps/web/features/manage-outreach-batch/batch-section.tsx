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
  getOutreachSendState,
  getOutreachTestPreview,
  listOutreachBatches,
} from "@entities/outreach-batch/api";
import {
  OUTREACH_BATCH_STATUS_LABEL,
  OUTREACH_BATCH_STATUS_TONE,
  type OutreachBatchRead,
  type OutreachBatchSummaryRead,
  type OutreachSendStateRead,
  type OutreachTestPreviewRead,
} from "@entities/outreach-batch";
import { listSenderProfiles } from "@entities/sender-profile/api";
import { formatDateTime } from "@shared/lib/format";
import type { OpportunityRead } from "@/lib/research/types";
import {
  applyOutreachMessageAction,
  approveOutreachBatchAction,
  cancelOutreachBatchAction,
  createOutreachBatchAction,
  pauseOutreachSendAction,
  regenerateOutreachBatchAction,
  reopenOutreachBatchAction,
  resumeOutreachSendAction,
  retryOutreachSentCopyAction,
  retryOutreachTestSentCopyAction,
  runOutreachSendDueAction,
  sendOutreachTestPreviewAction,
  startOutreachSendAction,
} from "./actions";
import { BatchMessageForm } from "./batch-message-form";

interface BatchEntry {
  batch: OutreachBatchRead;
  summary: OutreachBatchSummaryRead | null;
  sendState: OutreachSendStateRead | null;
  testPreview: OutreachTestPreviewRead | null;
}

function targetMarketLabel(
  opportunity: OpportunityRead,
  targetMarketId: string | null,
): string | null {
  if (!targetMarketId) return null;
  const market = opportunity.targetMarkets.find((m) => m.id === targetMarketId);
  return market ? `${market.country} · ${market.segment}` : null;
}

function Funnel({
  summary,
  sendState,
}: {
  summary: OutreachBatchSummaryRead;
  sendState: OutreachSendStateRead | null;
}) {
  const c = summary.counts;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Lead candidates: <span className="text-foreground">{c.leadCandidates}</span>
        </span>
        <span>
          Draftable (qualified):{" "}
          <span className="text-foreground">{c.eligibleLeads}</span>
        </span>
        <span>
          Rejected / not qualified / stale:{" "}
          <span className="text-foreground">{c.rejectedOrStale}</span>
        </span>
        <span>
          Excluded by human decision:{" "}
          <span className="text-foreground">{c.excludedByDecision}</span>
        </span>
        <span>
          Without usable recipient:{" "}
          <span className="text-foreground">{c.withoutRecipient}</span>
        </span>
        <span>
          Generated drafts:{" "}
          <span className="text-foreground">{c.generatedDrafts}</span>
        </span>
      </div>
      {sendState ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Approved: <span className="text-foreground">{sendState.approved}</span>
          </span>
          <span>
            Pending: <span className="text-foreground">{sendState.pending}</span>
          </span>
          <span>
            Queued: <span className="text-foreground">{sendState.queued}</span>
          </span>
          <span>
            Sent: <span className="text-foreground">{sendState.sent}</span>
          </span>
          <span>
            Failed: <span className="text-foreground">{sendState.failed}</span>
          </span>
          <span>
            Sent-copy failures:{" "}
            <span className="text-foreground">{sendState.sentCopyFailures}</span>
          </span>
          <span>
            Pacing:{" "}
            <span className="text-foreground">{sendState.pacingSeconds}s / mailbox</span>
          </span>
          {sendState.nextScheduledAt ? (
            <span>
              Next send:{" "}
              <span className="text-foreground">
                {formatDateTime(sendState.nextScheduledAt)}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground/80">
        Market Research findings are broader than outreach-ready leads: only
        qualified leads with a usable published recipient become drafts; the rest
        are counted here (research offerings/companies themselves are not all
        lead candidates).
      </p>
    </div>
  );
}

function TestPreviewPanel({
  productId,
  opportunity,
  batch,
  preview,
}: {
  productId: string;
  opportunity: OpportunityRead;
  batch: OutreachBatchRead;
  preview: OutreachTestPreviewRead | null;
}) {
  const ready = preview?.drafts.filter((draft) => draft.ready) ?? [];
  const copyFailures = (preview?.lastDeliveries ?? []).filter(
    (delivery) => delivery.status === "SENT" && delivery.sentCopyStatus === "FAILED",
  );
  return (
    <details className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Send test preview (controlled verification)
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs text-muted-foreground">
          Sends the <strong>actual prepared content</strong> (sender identity,
          Reply-To, subject, plain-text + HTML body, signature/logo, MIME
          formatting) to the selected <strong>test</strong> addresses only. The
          production recipients will <strong>not receive anything</strong>, and
          batch/send state is never advanced. This does send real email to the
          selected test addresses.
        </p>
        {preview ? (
          <>
            <div className="text-xs text-muted-foreground">
              Drafts ready:{" "}
              <span className="text-foreground">{preview.readyCount}</span> · not
              ready: <span className="text-foreground">{preview.blockedCount}</span>
            </div>
            <ul className="space-y-1 text-xs">
              {preview.drafts.map((draft) => (
                <li key={draft.draftId} className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground">
                    {draft.subject ?? "(no subject)"}
                  </span>
                  <span className="text-muted-foreground">
                    → intended {draft.recipientEmail ?? "no recipient"}
                  </span>
                  {draft.ready ? (
                    <Badge tone="success">ready</Badge>
                  ) : (
                    <Badge tone="warning">{draft.blockedReason ?? "not ready"}</Badge>
                  )}
                  <span className="text-muted-foreground">
                    {draft.approvalStatus === "APPROVED"
                      ? "previewing the currently approved version"
                      : "previewing the current pending/editing version"}
                  </span>
                </li>
              ))}
            </ul>
            <form
              action={sendOutreachTestPreviewAction.bind(
                null,
                opportunity.id,
                batch.id,
                productId,
              )}
              className="space-y-2"
            >
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-muted-foreground">
                  Test recipients (allowlist)
                </legend>
                {preview.allowlist.map((email, index) => (
                  <label key={email} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      name="testRecipients"
                      value={email}
                      defaultChecked={index === 0}
                    />
                    <span className="text-foreground">{email}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-muted-foreground">
                  Which drafts
                </legend>
                <label className="flex items-center gap-2 text-xs">
                  <input type="radio" name="scope" value="ALL" defaultChecked />
                  <span>
                    All currently generated drafts ({preview.readyCount})
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="radio" name="scope" value="SELECTED" />
                  <span>One representative draft</span>
                </label>
                <select
                  name="draftId"
                  defaultValue=""
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="">(select a ready draft)</option>
                  {ready.map((draft) => (
                    <option key={draft.draftId} value={draft.draftId}>
                      {(draft.subject ?? "(no subject)")} →{" "}
                      {draft.recipientEmail ?? "no recipient"}
                    </option>
                  ))}
                </select>
              </fieldset>
              <label className="block text-xs text-muted-foreground">
                Optional subject prefix (default keeps the real subject)
                <input
                  name="subjectPrefix"
                  placeholder="e.g. [TEST]"
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="confirm" required className="mt-0.5" />
                <span>
                  I understand this sends real email to the selected test
                  addresses only, and that the production recipients will not
                  receive anything.
                </span>
              </label>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="cursor-pointer"
                disabled={preview.readyCount === 0}
              >
                Send test copies
              </Button>
            </form>
            {preview.lastDeliveries.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent test deliveries
                </p>
                <ul className="space-y-1 text-xs">
                  {preview.lastDeliveries.map((delivery) => (
                    <li key={delivery.id} className="text-muted-foreground">
                      <span className="text-foreground">
                        {delivery.testRecipient}
                      </span>{" "}
                      ({delivery.status === "SENT" ? "sent" : "failed"}, Sent
                      copy: {delivery.sentCopyStatus.toLowerCase()}) ← intended{" "}
                      {delivery.originalRecipient} ·{" "}
                      {formatDateTime(delivery.createdAt)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {copyFailures.length > 0 ? (
              <form
                action={retryOutreachTestSentCopyAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
                  productId,
                )}
              >
                <Button type="submit" size="sm" variant="ghost" className="cursor-pointer">
                  Retry test Sent copies (no resend)
                </Button>
              </form>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Test preview unavailable.
          </p>
        )}
      </div>
    </details>
  );
}

function BatchBlock({
  productId,
  opportunity,
  entry,
  senderLabel,
  readOnly = false,
}: {
  productId: string;
  opportunity: OpportunityRead;
  entry: BatchEntry;
  senderLabel: string | null;
  readOnly?: boolean;
}) {
  const { batch, summary, sendState, testPreview } = entry;
  const market = targetMarketLabel(opportunity, batch.targetMarketId);
  // Remounts the editor (clearing its dirty state) whenever the applied strategy
  // changes, e.g. after a successful Apply batch message.
  const strategyKey = [
    batch.messageStrategy?.subject ?? "",
    batch.messageStrategy?.proposition ?? "",
    batch.messageStrategy?.terms ?? "",
    batch.messageStrategy?.cta ?? "",
  ].join("\u001f");
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          #{batch.id.slice(0, 8)}
        </span>
        <Badge tone={OUTREACH_BATCH_STATUS_TONE[batch.status]}>
          {OUTREACH_BATCH_STATUS_LABEL[batch.status]}
        </Badge>
        {batch.paused ? <Badge tone="warning">Paused</Badge> : null}
        <span className="text-xs text-muted-foreground">
          Created {formatDateTime(batch.createdAt)}
        </span>
        <span className="text-xs text-muted-foreground">
          {batch.language.toUpperCase()}
          {market ? ` · ${market}` : ""}
        </span>
        {batch.approvedAt ? (
          <span className="text-xs text-muted-foreground">
            Approved {formatDateTime(batch.approvedAt)}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Opportunity: {opportunity.name} · Sender: {senderLabel ?? "not assigned"}
      </p>

      {summary ? <Funnel summary={summary} sendState={sendState} /> : null}

      {summary && summary.representative.length > 0 ? (
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
                <p className="text-muted-foreground">{preview.bodyExcerpt}…</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {readOnly ? null : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {batch.status === "DRAFT" ? (
              <form
                action={approveOutreachBatchAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
                  productId,
                )}
              >
                <Button type="submit" size="sm" className="cursor-pointer">
                  Approve whole batch
                </Button>
              </form>
            ) : null}
            {batch.status === "APPROVED" || batch.status === "QUEUED" ? (
              <form
                action={startOutreachSendAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
                  productId,
                )}
              >
                <Button type="submit" size="sm" className="cursor-pointer">
                  Start sending
                </Button>
              </form>
            ) : null}
            {batch.status === "SENDING" ? (
              <>
                <form
                  action={pauseOutreachSendAction.bind(
                    null,
                    opportunity.id,
                    batch.id,
                    productId,
                  )}
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer"
                  >
                    Pause
                  </Button>
                </form>
                <form
                  action={resumeOutreachSendAction.bind(
                    null,
                    opportunity.id,
                    batch.id,
                    productId,
                  )}
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer"
                  >
                    Resume
                  </Button>
                </form>
                <form
                  action={runOutreachSendDueAction.bind(
                    null,
                    opportunity.id,
                    batch.id,
                    productId,
                  )}
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer"
                  >
                    Run due now
                  </Button>
                </form>
              </>
            ) : null}
            {(["DRAFT", "FAILED"] as string[]).includes(batch.status) ? (
              <form
                action={regenerateOutreachBatchAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
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
            ) : null}
            {sendState && sendState.sentCopyFailures > 0 ? (
              <form
                action={retryOutreachSentCopyAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
                  productId,
                )}
              >
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="cursor-pointer"
                >
                  Retry Sent copies (no resend)
                </Button>
              </form>
            ) : null}
            <form
              action={cancelOutreachBatchAction.bind(
                null,
                opportunity.id,
                batch.id,
                productId,
              )}
            >
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="cursor-pointer"
              >
                Cancel / archive
              </Button>
            </form>
          </div>
          {batch.status === "APPROVED" ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">
                This batch is approved and has not started sending. Reopen it for
                editing to change the message. The approved versions are kept as
                immutable history.
              </p>
              <form
                action={reopenOutreachBatchAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
                  productId,
                )}
                className="flex flex-wrap items-center gap-3"
              >
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="resetCustomized" />
                  <span>Also reset individually customized drafts</span>
                </label>
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="cursor-pointer"
                >
                  Reopen for editing
                </Button>
              </form>
            </div>
          ) : null}
          {batch.status === "DRAFT" || batch.status === "FAILED" ? (
            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Edit batch message
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Shared fields override the {batch.language.toUpperCase()} template
                for the whole batch; each recipient keeps their evidence-backed
                personalization (greeting/observation/signature). Applying
                regenerates the current non-customized drafts (
                {summary?.counts.regeneratableDrafts ?? 0} pending /{" "}
                {summary?.counts.approvedDrafts ?? 0} previously approved) as new
                pending versions; {summary?.counts.customizedDrafts ?? 0}{" "}
                individually customized are untouched (use Open draft for
                per-recipient edits). A blank field falls back to the language
                default.
              </p>
              <BatchMessageForm
                key={strategyKey}
                action={applyOutreachMessageAction.bind(
                  null,
                  opportunity.id,
                  batch.id,
                  productId,
                )}
                initial={{
                  subject: batch.messageStrategy?.subject ?? "",
                  proposition: batch.messageStrategy?.proposition ?? "",
                  terms: batch.messageStrategy?.terms ?? "",
                  cta: batch.messageStrategy?.cta ?? "",
                }}
              />
            </details>
          ) : null}
          <TestPreviewPanel
            productId={productId}
            opportunity={opportunity}
            batch={batch}
            preview={testPreview}
          />
          <p className="text-xs text-muted-foreground">
            Approving freezes the exact versions but does not send. Sending starts
            only via <strong>Start sending</strong>; the scheduler is off by
            default (manual <em>Run due now</em>). Pacing is a deliverability
            safeguard, not a guarantee against spam filtering.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Batch/campaign review surface. Multiple batches per opportunity are expected;
 * each block is identified by a short id, creation time, language/market, sender
 * and status so the operator can tell which batch is which. Cancelled batches are
 * archived behind a control (never deleted).
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

  const groups: Array<{
    opportunity: OpportunityRead;
    active: BatchEntry[];
    cancelled: BatchEntry[];
  }> = [];

  for (const opportunity of opportunities) {
    const active: BatchEntry[] = [];
    const cancelled: BatchEntry[] = [];
    let batches: OutreachBatchRead[] = [];
    try {
      batches = await listOutreachBatches(opportunity.id);
    } catch {
      batches = [];
    }
    for (const batch of batches) {
      let summary: OutreachBatchSummaryRead | null = null;
      let sendState: OutreachSendStateRead | null = null;
      let testPreview: OutreachTestPreviewRead | null = null;
      try {
        summary = await getOutreachBatch(opportunity.id, batch.id);
        sendState = await getOutreachSendState(opportunity.id, batch.id);
      } catch {
        summary = null;
      }
      try {
        testPreview = await getOutreachTestPreview(opportunity.id, batch.id);
      } catch {
        testPreview = null;
      }
      const entry: BatchEntry = { batch, summary, sendState, testPreview };
      if (batch.status === "CANCELLED") cancelled.push(entry);
      else active.push(entry);
    }
    groups.push({ opportunity, active, cancelled });
  }

  const labelFor = (batch: OutreachBatchRead) =>
    batch.senderProfileId
      ? (senderProfiles.find((p) => p.id === batch.senderProfileId)?.label ??
        batch.senderProfileId)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach batches</CardTitle>
        <CardDescription>
          Generate and approve outreach drafts per batch. Multiple batches per
          opportunity are expected; each is identified below. Approval freezes the
          exact versions; sending starts only when a human clicks Start sending.
          No sending is automatic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map(({ opportunity, active, cancelled }) => (
          <div key={opportunity.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{opportunity.name}</span>
              <form
                action={createOutreachBatchAction.bind(
                  null,
                  opportunity.id,
                  productId,
                )}
              >
                <Button type="submit" size="sm" variant="ghost" className="cursor-pointer">
                  New batch
                </Button>
              </form>
            </div>

            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active batch. Generate one to review drafts for eligible leads.
              </p>
            ) : (
              active.map((entry) => (
                <BatchBlock
                  key={entry.batch.id}
                  productId={productId}
                  opportunity={opportunity}
                  entry={entry}
                  senderLabel={labelFor(entry.batch)}
                />
              ))
            )}

            {cancelled.length > 0 ? (
              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Show archived/cancelled batches ({cancelled.length})
                </summary>
                <div className="mt-3 space-y-3">
                  {cancelled.map((entry) => (
                    <BatchBlock
                      key={entry.batch.id}
                      productId={productId}
                      opportunity={opportunity}
                      entry={entry}
                      senderLabel={labelFor(entry.batch)}
                      readOnly
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
