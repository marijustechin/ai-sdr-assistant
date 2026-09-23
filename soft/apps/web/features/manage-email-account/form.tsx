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
import { AlertIcon, CheckCircleIcon } from "@/components/ui/icons";
import {
  createEmailAccountAction,
  updateEmailAccountAction,
} from "./actions";
import {
  buildEmailAccountPayload,
  hasImapConfiguration,
  hasSmtpConfiguration,
} from "./payload";
import type {
  EmailAccountActionResult,
  EmailAccountRead,
  EmailAccountStatus,
  EmailTlsMode,
} from "@entities/email-account";

interface FormState {
  label: string;
  accountEmail: string;
  status: EmailAccountStatus;
  provider: string;
  credentialsShared: boolean;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpTlsMode: "" | EmailTlsMode;
  smtpUsername: string;
  smtpPassword: string;
  clearSmtpPassword: boolean;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: string;
  imapTlsMode: "" | EmailTlsMode;
  imapUsername: string;
  imapPassword: string;
  clearImapPassword: boolean;
}

function initialState(account?: EmailAccountRead): FormState {
  return {
    label: account?.label ?? "",
    accountEmail: account?.accountEmail ?? "",
    status: account?.status ?? "ACTIVE",
    provider: account?.provider ?? "",
    credentialsShared: account?.credentialsShared ?? false,
    smtpEnabled: account ? hasSmtpConfiguration(account) : false,
    smtpHost: account?.smtpHost ?? "",
    smtpPort: account?.smtpPort != null ? String(account.smtpPort) : "",
    smtpTlsMode: account?.smtpTlsMode ?? "",
    smtpUsername: account?.smtpUsername ?? "",
    smtpPassword: "",
    clearSmtpPassword: false,
    imapEnabled: account ? hasImapConfiguration(account) : false,
    imapHost: account?.imapHost ?? "",
    imapPort: account?.imapPort != null ? String(account.imapPort) : "",
    imapTlsMode: account?.imapTlsMode ?? "",
    imapUsername: account?.imapUsername ?? "",
    imapPassword: "",
    clearImapPassword: false,
  };
}

const AUTOFILL_OFF = {
  autoComplete: "new-password",
  "data-lpignore": "true",
  "data-1p-ignore": true,
  "data-bwignore": "true",
} as const;

export function EmailAccountForm({
  mode = "create",
  accountId,
  initial,
}: {
  mode?: "create" | "edit";
  accountId?: string;
  initial?: EmailAccountRead;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [state, setState] = useState<FormState>(initialState(initial));
  const [result, setResult] = useState<EmailAccountActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const values = buildEmailAccountPayload(state, mode);
      const response = isEdit
        ? await updateEmailAccountAction(accountId ?? "", values)
        : await createEmailAccountAction(values);
      setResult(response);
      if (response.ok) {
        if (!isEdit) {
          setState(initialState());
        } else {
          set("smtpPassword", "");
          set("clearSmtpPassword", false);
          set("imapPassword", "");
          set("clearImapPassword", false);
        }
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "The email account could not be saved." });
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
            Email account saved.
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
          <CardTitle>Mailbox</CardTitle>
          <CardDescription>
            One technical connection. Several sender identities may reference it.
            No email is sent from here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Account label" htmlFor="label" required error={fieldError("label")}>
              <Input value={state.label} onChange={(e) => set("label", e.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Account email" htmlFor="accountEmail" required error={fieldError("accountEmail")}>
              <Input type="email" value={state.accountEmail} onChange={(e) => set("accountEmail", e.target.value)} autoComplete="off" />
            </FormField>
          </div>
          <FormField label="Provider hint (optional)" htmlFor="provider" error={fieldError("provider")}>
            <Input value={state.provider} onChange={(e) => set("provider", e.target.value)} placeholder="GENERIC, SAPIENSMETRIC…" autoComplete="off" />
          </FormField>
          {isEdit ? (
            <FormField label="Status" htmlFor="status" className="max-w-xs">
              <Select value={state.status} onChange={(e) => set("status", e.target.value as EmailAccountStatus)}>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </Select>
            </FormField>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.credentialsShared}
              onChange={(e) => set("credentialsShared", e.target.checked)}
            />
            IMAP reuses the SMTP username and password
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMTP (sending, later)</CardTitle>
          <CardDescription>
            Stored for later use only; this application does not send email. The
            password is encrypted and never shown again.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={state.smtpEnabled}
              onChange={(e) => set("smtpEnabled", e.target.checked)}
            />
            Configure SMTP
          </label>

          {state.smtpEnabled ? (
            <>
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField label="Host" htmlFor="smtpHost" error={fieldError("smtpHost")}>
                  <Input value={state.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} autoComplete="off" />
                </FormField>
                <FormField label="Port" htmlFor="smtpPort" error={fieldError("smtpPort")}>
                  <Input inputMode="numeric" value={state.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} autoComplete="off" />
                </FormField>
                <FormField label="TLS mode" htmlFor="smtpTlsMode" error={fieldError("smtpTlsMode")}>
                  <Select value={state.smtpTlsMode} onChange={(e) => set("smtpTlsMode", e.target.value as FormState["smtpTlsMode"])}>
                    <option value="">Not configured</option>
                    <option value="NONE">NONE</option>
                    <option value="STARTTLS">STARTTLS</option>
                    <option value="SSL_TLS">SSL_TLS</option>
                  </Select>
                </FormField>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Username" htmlFor="smtpUsername" error={fieldError("smtpUsername")}>
                  <Input value={state.smtpUsername} onChange={(e) => set("smtpUsername", e.target.value)} autoComplete="off" />
                </FormField>
                <FormField
                  label={isEdit ? "New password (leave empty to keep)" : "Password"}
                  htmlFor="smtpPassword"
                  error={fieldError("smtpPassword")}
                  hint={
                    isEdit && initial?.smtpPasswordConfigured
                      ? "A password is configured. Leave empty to keep it."
                      : undefined
                  }
                >
                  <Input
                    type="password"
                    name="email-account-smtp-password"
                    value={state.smtpPassword}
                    onChange={(e) => set("smtpPassword", e.target.value)}
                    {...AUTOFILL_OFF}
                  />
                </FormField>
              </div>
              {isEdit && initial?.smtpPasswordConfigured ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.clearSmtpPassword}
                    onChange={(e) => set("clearSmtpPassword", e.target.checked)}
                  />
                  Clear the stored SMTP password
                </label>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              SMTP is off. SMTP fields are not submitted.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IMAP (monitoring, later)</CardTitle>
          <CardDescription>
            Stored for future mailbox monitoring only. Nothing is read from the
            mailbox in this version.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={state.imapEnabled}
              onChange={(e) => set("imapEnabled", e.target.checked)}
            />
            Configure IMAP
          </label>

          {state.imapEnabled ? (
            <>
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField label="Host" htmlFor="imapHost" error={fieldError("imapHost")}>
                  <Input value={state.imapHost} onChange={(e) => set("imapHost", e.target.value)} autoComplete="off" />
                </FormField>
                <FormField label="Port" htmlFor="imapPort" error={fieldError("imapPort")}>
                  <Input inputMode="numeric" value={state.imapPort} onChange={(e) => set("imapPort", e.target.value)} autoComplete="off" />
                </FormField>
                <FormField label="TLS mode" htmlFor="imapTlsMode" error={fieldError("imapTlsMode")}>
                  <Select value={state.imapTlsMode} onChange={(e) => set("imapTlsMode", e.target.value as FormState["imapTlsMode"])}>
                    <option value="">Not configured</option>
                    <option value="NONE">NONE</option>
                    <option value="STARTTLS">STARTTLS</option>
                    <option value="SSL_TLS">SSL_TLS</option>
                  </Select>
                </FormField>
              </div>
              {state.credentialsShared ? (
                <p className="text-xs text-muted-foreground">
                  Separate IMAP credentials are not submitted: this account reuses
                  the SMTP username and password.
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Username" htmlFor="imapUsername" error={fieldError("imapUsername")}>
                    <Input value={state.imapUsername} onChange={(e) => set("imapUsername", e.target.value)} autoComplete="off" />
                  </FormField>
                  <FormField
                    label={isEdit ? "New password (leave empty to keep)" : "Password"}
                    htmlFor="imapPassword"
                    error={fieldError("imapPassword")}
                    hint={
                      isEdit && initial?.imapPasswordConfigured
                        ? "A password is configured. Leave empty to keep it."
                        : undefined
                    }
                  >
                    <Input
                      type="password"
                      name="email-account-imap-password"
                      value={state.imapPassword}
                      onChange={(e) => set("imapPassword", e.target.value)}
                      {...AUTOFILL_OFF}
                    />
                  </FormField>
                </div>
              )}
              {isEdit && initial?.imapPasswordConfigured && !state.credentialsShared ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.clearImapPassword}
                    onChange={(e) => set("clearImapPassword", e.target.checked)}
                  />
                  Clear the stored IMAP password
                </label>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              IMAP is off. IMAP fields are not submitted.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="cursor-pointer" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create account"}
        </Button>
        <Link
          href="/settings/email-accounts"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Back to email accounts
        </Link>
        <Badge tone="outline">
          {isEdit ? "PATCH /email-accounts/:id" : "POST /email-accounts"}
        </Badge>
      </div>
    </form>
  );
}
