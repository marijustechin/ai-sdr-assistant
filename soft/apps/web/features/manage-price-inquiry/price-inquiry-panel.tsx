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
  createPriceInquiryDraftAction,
  updatePriceInquiryDraftAction,
} from "./actions";

interface SenderOption {
  id: string;
  label: string;
}

function DraftEditor({
  productId,
  opportunityId,
  leadId,
  draft,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  draft: PriceInquiryDraftRead;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [recipientEmail, setRecipientEmail] = useState(
    draft.recipientEmail ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <li className="space-y-3 rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PRICE_INQUIRY_STATUS_TONE[draft.status]}>
          {PRICE_INQUIRY_STATUS_LABEL[draft.status]}
        </Badge>
        <Badge tone="outline">Not sent — awaiting human review</Badge>
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

      <FormField label="Recipient email" htmlFor={`rfq-recipient-${draft.id}`}>
        <Input
          id={`rfq-recipient-${draft.id}`}
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          autoComplete="off"
        />
      </FormField>
      <FormField label="Subject" htmlFor={`rfq-subject-${draft.id}`}>
        <Input
          id={`rfq-subject-${draft.id}`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          autoComplete="off"
        />
      </FormField>
      <FormField label="Message" htmlFor={`rfq-body-${draft.id}`}>
        <Textarea
          id={`rfq-body-${draft.id}`}
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="cursor-pointer"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {message ? <span className="text-xs">{message}</span> : null}
      </div>

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
 * Price inquiry (RFQ) review panel. Drafts are persisted for human review and
 * are never sent from here; there is intentionally no send action.
 */
export function PriceInquiryPanel({
  productId,
  opportunityId,
  leadId,
  drafts,
  senderProfiles,
  defaultSenderProfileId,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  drafts: PriceInquiryDraftRead[];
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
          Ask this supplier to quote. Drafts are saved for human review; nothing
          is sent from here.
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
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
