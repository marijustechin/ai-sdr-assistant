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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@shared/lib/format";
import {
  PRICE_INQUIRY_STATUS_LABEL,
  PRICE_INQUIRY_STATUS_TONE,
  type PriceInquiryDraftRead,
} from "@entities/price-inquiry";
import {
  MARKET_RESEARCH_STATE_LABEL,
  MARKET_RESEARCH_STATE_TONE,
  MATCH_CONFIDENCE_LABEL,
  QUOTE_FIELDS,
  QUOTE_FIELD_LABEL,
  type QuoteCollectionItemRead,
  type SupplierQuoteRead,
} from "@entities/quote-collection";
import {
  checkPriceInquiryRepliesAction,
  createPriceInquiryDraftAction,
  sendPriceInquiryAction,
  updatePriceInquiryDraftAction,
} from "./actions";

interface SenderOption {
  id: string;
  label: string;
}

function quoteFieldValue(
  quote: SupplierQuoteRead,
  field: (typeof QUOTE_FIELDS)[number],
): string | null {
  if (field === "vatIncluded") {
    if (quote.vatIncluded === null) return null;
    return quote.vatIncluded ? "Yes" : "No";
  }
  if (field === "priceAmount") {
    return quote.priceAmount === null ? null : String(quote.priceAmount);
  }
  const value = quote[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function QuoteSummary({ quote }: { quote: SupplierQuoteRead }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success">Structured quote</Badge>
        {quote.warnings.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {quote.warnings.length} warning(s)
          </span>
        ) : null}
      </div>
      <dl className="grid gap-1 sm:grid-cols-2">
        {QUOTE_FIELDS.map((field) => {
          const value = quoteFieldValue(quote, field);
          return (
            <div key={field} className="flex gap-2">
              <dt className="text-muted-foreground">
                {QUOTE_FIELD_LABEL[field]}:
              </dt>
              <dd className={value ? "text-foreground" : "text-muted-foreground"}>
                {value ?? "Not stated"}
              </dd>
            </div>
          );
        })}
      </dl>
      {quote.warnings.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-warning-foreground">
          {quote.warnings.map((warning) => (
            <li key={warning}>{warning.replaceAll("_", " ")}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DraftEditor({
  productId,
  opportunityId,
  leadId,
  draft,
  collection,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  draft: PriceInquiryDraftRead;
  collection: QuoteCollectionItemRead | null;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [recipientEmail, setRecipientEmail] = useState(
    draft.recipientEmail ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sent = draft.status !== "READY_FOR_HUMAN_REVIEW";
  const outbound = collection?.outbound ?? null;

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await updatePriceInquiryDraftAction(
      productId,
      opportunityId,
      leadId,
      draft.id,
      {
        subject,
        body,
        recipientEmail: recipientEmail.trim().length > 0
          ? recipientEmail.trim()
          : null,
      },
    );
    setMessage(result.ok ? "Draft saved." : (result.message ?? "Could not save."));
    setSaving(false);
  }

  async function send() {
    setSending(true);
    setMessage(null);
    const result = await sendPriceInquiryAction(
      productId,
      opportunityId,
      leadId,
      draft.id,
      true,
    );
    setMessage(
      result.ok ? "Submitted to outgoing SMTP server." : (result.message ?? null),
    );
    setSending(false);
    setConfirmingSend(false);
  }

  async function checkReplies() {
    setChecking(true);
    setMessage(null);
    const result = await checkPriceInquiryRepliesAction(
      productId,
      opportunityId,
      leadId,
      draft.id,
    );
    setMessage(result.message ?? (result.ok ? "Checked." : "Could not check."));
    setChecking(false);
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PRICE_INQUIRY_STATUS_TONE[draft.status]}>
          {PRICE_INQUIRY_STATUS_LABEL[draft.status]}
        </Badge>
        {collection ? (
          <Badge tone={MARKET_RESEARCH_STATE_TONE[collection.marketResearchState]}>
            {MARKET_RESEARCH_STATE_LABEL[collection.marketResearchState]}
          </Badge>
        ) : (
          <Badge tone="outline">Not sent — awaiting human review</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          v{draft.version} · {formatDateTime(draft.createdAt)}
        </span>
      </div>

      {draft.inputsStale ? (
        <div className="space-y-1">
          {draft.staleReasons.map((reason) => (
            <p key={reason} className="text-xs text-destructive">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      <p className="text-muted-foreground">
        Recipient: {draft.recipientEmail ?? "none selected"} —{" "}
        {draft.recipientRationale}
      </p>
      {draft.senderSnapshot ? (
        <p className="text-muted-foreground">
          Sender:{" "}
          {[
            draft.senderSnapshot.senderName,
            draft.senderSnapshot.senderTitle,
            draft.senderSnapshot.companyName,
            draft.senderSnapshot.fromEmail,
          ]
            .filter((part): part is string => Boolean(part))
            .join(" · ")}
        </p>
      ) : null}

      {outbound ? (
        <div className="space-y-1 rounded-lg border border-border p-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={outbound.submissionStatus === "SUBMITTED" ? "success" : "danger"}
            >
              {outbound.submissionStatus === "SUBMITTED"
                ? "Submitted to outgoing SMTP server"
                : `Send failed (${outbound.failureCode ?? "error"})`}
            </Badge>
            <span>Sent {formatDateTime(outbound.sentAt)}</span>
          </div>
          <p className="break-all">Message-ID: {outbound.messageId}</p>
          <p>To: {outbound.recipientEmail} · From: {outbound.fromEmail}</p>
        </div>
      ) : null}

      <FormField label="Recipient email" htmlFor={`rfq-recipient-${draft.id}`}>
        <Input
          id={`rfq-recipient-${draft.id}`}
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          autoComplete="off"
          disabled={sent}
        />
      </FormField>
      <FormField label="Subject" htmlFor={`rfq-subject-${draft.id}`}>
        <Input
          id={`rfq-subject-${draft.id}`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          autoComplete="off"
          disabled={sent}
        />
      </FormField>
      <FormField label="Message" htmlFor={`rfq-body-${draft.id}`}>
        <Textarea
          id={`rfq-body-${draft.id}`}
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sent}
        />
      </FormField>

      {!sent ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="cursor-pointer"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {confirmingSend ? (
            <>
              <Button
                type="button"
                onClick={send}
                disabled={sending}
                className="cursor-pointer"
              >
                {sending ? "Sending…" : "Confirm send"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingSend(false)}
                disabled={sending}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => setConfirmingSend(true)}
              disabled={saving || draft.inputsStale || !recipientEmail}
              className="cursor-pointer"
            >
              Send price inquiry
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={checkReplies}
            disabled={checking}
            className="cursor-pointer"
          >
            {checking ? "Checking…" : "Check for replies"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Manual, bounded mailbox check — nothing runs automatically.
          </span>
        </div>
      )}

      {message ? <p className="text-xs">{message}</p> : null}

      {collection && collection.inboundMessages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Supplier replies
          </p>
          <ul className="space-y-3">
            {collection.inboundMessages.map((inbound) => {
              const quote = collection.quotes.find(
                (candidate) => candidate.inboundMessageId === inbound.id,
              );
              return (
                <li
                  key={inbound.id}
                  className="space-y-2 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      tone={
                        inbound.processingStatus === "EXTRACTED"
                          ? "success"
                          : inbound.processingStatus === "MATCHED"
                            ? "info"
                            : "warning"
                      }
                    >
                      {MATCH_CONFIDENCE_LABEL[inbound.matchConfidence]}
                    </Badge>
                    {inbound.receivedAt ? (
                      <span>Received {formatDateTime(inbound.receivedAt)}</span>
                    ) : null}
                                  </div>
                  <p className="text-muted-foreground">
                    From: {inbound.fromEmail ?? "unknown"} ·{" "}
                    {inbound.subject ?? "(no subject)"}
                  </p>
                  {inbound.processingStatus === "UNMATCHED" ? (
                    <p className="text-xs text-warning-foreground">
                      Could not be linked to this RFQ with confidence — needs
                      human review.
                    </p>
                  ) : null}
                  {quote ? <QuoteSummary quote={quote} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <details>
        <summary className="cursor-pointer text-xs text-primary underline-offset-2 hover:underline">
          View generated original
        </summary>
        <pre className="mt-2 whitespace-pre-wrap rounded border border-border p-3 font-sans text-xs text-muted-foreground">
          {draft.generatedBody}
        </pre>
      </details>
    </li>
  );
}

/**
 * Price inquiry (RFQ) review panel. Drafts are reviewed here; sending and reply
 * checking are explicit human actions (market research, never buyer outreach).
 */
export function PriceInquiryPanel({
  productId,
  opportunityId,
  leadId,
  drafts,
  collection,
  senderProfiles,
  defaultSenderProfileId,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  drafts: PriceInquiryDraftRead[];
  collection: QuoteCollectionItemRead[];
  senderProfiles: SenderOption[];
  defaultSenderProfileId: string | null;
}) {
  const [senderProfileId, setSenderProfileId] = useState(
    defaultSenderProfileId ?? senderProfiles[0]?.id ?? "",
  );
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setMessage(null);
    const result = await createPriceInquiryDraftAction(
      productId,
      opportunityId,
      leadId,
      {
        productId,
        ...(senderProfileId ? { senderProfileId } : {}),
      },
    );
    setMessage(
      result.ok
        ? "Price inquiry draft created."
        : (result.message ?? "Could not create the draft."),
    );
    setCreating(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price inquiry (RFQ)</CardTitle>
        <CardDescription>
          A market-research request for a supplier quote. Send and reply checks
          are explicit human actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {senderProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create an active sender profile linked to an email account first
            (Settings → Sender profiles).
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              label="Sender profile"
              htmlFor="rfq-sender-profile"
              className="min-w-56"
            >
              <Select
                id="rfq-sender-profile"
                value={senderProfileId}
                onChange={(e) => setSenderProfileId(e.target.value)}
              >
                {senderProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button
              type="button"
              onClick={create}
              disabled={creating || senderProfileId.length === 0}
              className="cursor-pointer"
            >
              {creating ? "Creating…" : "Create price inquiry"}
            </Button>
          </div>
        )}

        {message ? <p className="text-sm">{message}</p> : null}

        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No price inquiry draft yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {drafts.map((draft) => (
              <DraftEditor
                key={draft.id}
                productId={productId}
                opportunityId={opportunityId}
                leadId={leadId}
                draft={draft}
                collection={
                  collection.find((item) => item.draftId === draft.id) ?? null
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
