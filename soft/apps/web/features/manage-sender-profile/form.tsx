"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { AlertIcon, CheckCircleIcon } from "@/components/ui/icons";
import {
  createSenderProfileAction,
  updateSenderProfileAction,
} from "./actions";
import { buildSenderProfilePayload } from "./payload";
import type {
  SenderProfileActionResult,
  SenderProfileRead,
  SenderProfileStatus,
} from "@entities/sender-profile";

interface FormState {
  label: string;
  senderName: string;
  senderTitle: string;
  companyName: string;
  fromEmail: string;
  replyToEmail: string;
  phone: string;
  website: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  logoUrl: string;
  includeLogoInSignature: boolean;
  signature: string;
  status: SenderProfileStatus;
  emailAccountId: string;
}

function initialState(profile?: SenderProfileRead): FormState {
  return {
    label: profile?.label ?? "",
    senderName: profile?.senderName ?? "",
    senderTitle: profile?.senderTitle ?? "",
    companyName: profile?.companyName ?? "",
    fromEmail: profile?.fromEmail ?? "",
    replyToEmail: profile?.replyToEmail ?? "",
    phone: profile?.phone ?? "",
    website: profile?.website ?? "",
    whatsappEnabled: profile?.whatsappEnabled ?? false,
    whatsappPhone: profile?.whatsappPhone ?? "",
    logoUrl: profile?.logoUrl ?? "",
    includeLogoInSignature: profile?.includeLogoInSignature ?? false,
    signature: profile?.signature ?? "",
    status: profile?.status ?? "ACTIVE",
    emailAccountId: profile?.emailAccountId ?? "",
  };
}

export function SenderProfileForm({
  mode = "create",
  profileId,
  initial,
  emailAccounts = [],
}: {
  mode?: "create" | "edit";
  profileId?: string;
  initial?: SenderProfileRead;
  emailAccounts?: Array<{ id: string; label: string; disabled: boolean }>;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [state, setState] = useState<FormState>(initialState(initial));
  const [result, setResult] = useState<SenderProfileActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const values = buildSenderProfilePayload(state, mode);
      const response = isEdit
        ? await updateSenderProfileAction(profileId ?? "", values)
        : await createSenderProfileAction(values);
      setResult(response);
      if (response.ok) {
        if (!isEdit) {
          setState(initialState());
        }
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "The sender profile could not be saved." });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldError = (key: string) => result?.fieldErrors?.[key];

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {result?.ok ? (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-foreground">
            <CheckCircleIcon className="size-5 text-success" />
            Sender profile saved.
          </CardContent>
        </Card>
      ) : null}
      {result && !result.ok ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-foreground">{result.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sender identity</CardTitle>
          <CardDescription>
            A reusable identity. It carries no credentials; optionally reference a
            mailbox connection for later sending. No profile is prefilled — enter
            your own details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FormField label="Profile label" htmlFor="label" required error={fieldError("label")}>
            <Input value={state.label} onChange={(e) => set("label", e.target.value)} autoComplete="off" />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Sender name" htmlFor="senderName" required error={fieldError("senderName")}>
              <Input value={state.senderName} onChange={(e) => set("senderName", e.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Role / title (optional)" htmlFor="senderTitle" error={fieldError("senderTitle")}>
              <Input value={state.senderTitle} onChange={(e) => set("senderTitle", e.target.value)} autoComplete="off" />
            </FormField>
          </div>
          <FormField
            label="Company / brand name (optional)"
            htmlFor="companyName"
            error={fieldError("companyName")}
            hint="Shown in the generated outreach closing when set; a company is never invented."
          >
            <Input value={state.companyName} onChange={(e) => set("companyName", e.target.value)} autoComplete="off" />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="From email" htmlFor="fromEmail" required error={fieldError("fromEmail")}>
              <Input type="email" value={state.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Reply-To email (optional)" htmlFor="replyToEmail" error={fieldError("replyToEmail")}>
              <Input type="email" value={state.replyToEmail} onChange={(e) => set("replyToEmail", e.target.value)} autoComplete="off" />
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Phone (optional)" htmlFor="phone" error={fieldError("phone")}>
              <Input value={state.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" />
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={state.whatsappEnabled}
                  onChange={(e) => set("whatsappEnabled", e.target.checked)}
                />
                Available on WhatsApp (display only — not a sending permission)
              </label>
            </FormField>
            <FormField
              label="Website (optional)"
              htmlFor="website"
              error={fieldError("website")}
              hint="Shown in the generated closing only when set; never invented."
            >
              <Input value={state.website} onChange={(e) => set("website", e.target.value)} autoComplete="off" />
            </FormField>
          </div>
          {state.whatsappEnabled ? (
            <FormField
              label="WhatsApp number (optional)"
              htmlFor="whatsappPhone"
              error={fieldError("whatsappPhone")}
              hint="Leave blank to use the main phone. A number is required if no main phone is set."
            >
              <Input value={state.whatsappPhone} onChange={(e) => set("whatsappPhone", e.target.value)} autoComplete="off" />
            </FormField>
          ) : null}
          <FormField
            label="Logo URL (optional)"
            htmlFor="logoUrl"
            error={fieldError("logoUrl")}
            hint="Shown in the HTML signature only when enabled below; never invented."
          >
            <Input value={state.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} autoComplete="off" />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={state.includeLogoInSignature}
                onChange={(e) =>
                  set("includeLogoInSignature", e.target.checked)
                }
              />
              Include logo in HTML signature (plain-text email never shows it)
            </label>
          </FormField>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Advanced / custom override
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              The generated outreach closing is composed from the structured
              fields above (name, role, company, phone, website). It does not read
              this free-text signature.
            </p>
            <FormField
              label="Custom signature (legacy — not used in generated outreach)"
              htmlFor="signature"
              error={fieldError("signature")}
              className="mt-3"
            >
              <Textarea rows={3} value={state.signature} onChange={(e) => set("signature", e.target.value)} />
            </FormField>
          </details>
          <FormField
            label="Mailbox connection (optional)"
            htmlFor="emailAccountId"
            error={fieldError("emailAccountId")}
            hint="Technical SMTP/IMAP settings live on the email account. Manage them under Settings → Email accounts."
          >
            <Select
              value={state.emailAccountId}
              onChange={(e) => set("emailAccountId", e.target.value)}
            >
              <option value="">No mailbox connection</option>
              {emailAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                  {account.disabled ? " (disabled)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
          {isEdit ? (
            <FormField label="Status" htmlFor="status" className="max-w-xs">
              <Select value={state.status} onChange={(e) => set("status", e.target.value as SenderProfileStatus)}>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </Select>
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="cursor-pointer" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create profile"}
        </Button>
        <Link
          href="/settings/sender-profiles"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Back to sender profiles
        </Link>
        <Badge tone="outline">
          {isEdit ? "PATCH /sender-profiles/:id" : "POST /sender-profiles"}
        </Badge>
      </div>
    </form>
  );
}
