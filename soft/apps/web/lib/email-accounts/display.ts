import type { EmailAccountRead, EmailAccountStatus } from "./types";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "outline";

export const EMAIL_ACCOUNT_STATUS_LABEL: Record<EmailAccountStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export const EMAIL_ACCOUNT_STATUS_TONE: Record<EmailAccountStatus, BadgeTone> = {
  ACTIVE: "success",
  DISABLED: "neutral",
};

function smtpPart(account: EmailAccountRead): string {
  if (!account.smtpHost || !account.smtpPort || !account.smtpTlsMode) {
    return "SMTP not configured";
  }
  const password = account.smtpPasswordConfigured
    ? "password set"
    : "no password set";
  return `SMTP ${account.smtpHost}:${account.smtpPort} · ${account.smtpTlsMode} · ${password}`;
}

function imapPart(account: EmailAccountRead): string {
  if (!account.imapHost || !account.imapPort || !account.imapTlsMode) {
    return "IMAP not configured";
  }
  const password = account.credentialsShared
    ? "shared SMTP credentials"
    : account.imapPasswordConfigured
      ? "password set"
      : "no password set";
  return `IMAP ${account.imapHost}:${account.imapPort} · ${account.imapTlsMode} · ${password}`;
}

/** Concise, operator-facing transport summary (never a secret). */
export function transportSummary(account: EmailAccountRead): string {
  return `${smtpPart(account)} · ${imapPart(account)}`;
}

/**
 * Email-account choices for the sender-profile selector. Disabled accounts are
 * included (so an existing reference is shown) but marked disabled; no account is
 * auto-selected.
 */
export function accountOptions(accounts: EmailAccountRead[]): Array<{
  id: string;
  label: string;
  disabled: boolean;
}> {
  return accounts.map((account) => ({
    id: account.id,
    label: account.label,
    disabled: account.status !== "ACTIVE",
  }));
}
