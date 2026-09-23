import type { EmailTlsMode } from "@entities/email-account";

/**
 * Form state for an email account. `smtpEnabled`/`imapEnabled` are explicit
 * operator opt-ins: transport fields (including a password value that may have
 * been autofilled) are **omitted from the payload entirely** unless the relevant
 * toggle is on, so an autofilled secret can never be submitted accidentally.
 */
export interface EmailAccountFormState {
  label: string;
  accountEmail: string;
  status: "ACTIVE" | "DISABLED";
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

/**
 * Build the email-account request body from the form state.
 *
 * - Identity fields are always included; `status` only when editing.
 * - **All SMTP/IMAP fields are omitted when their toggle is off on create**, so
 *   an autofilled or incidental password can never be submitted. On edit, turning
 *   a toggle off clears that transport explicitly (nulls, never a value).
 * - When a transport is on: fields are included when provided, the password is
 *   included only when non-empty (write-only), and clearing is explicit.
 * - When credentials are shared with SMTP, separate IMAP credentials are omitted.
 */
export function buildEmailAccountPayload(
  state: EmailAccountFormState,
  mode: "create" | "edit",
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    label: state.label,
    accountEmail: state.accountEmail,
    credentialsShared: state.credentialsShared,
  };
  if (mode === "edit") values.status = state.status;
  if (state.provider.trim().length > 0) values.provider = state.provider;

  if (state.smtpEnabled) {
    const host = state.smtpHost.trim();
    const port = state.smtpPort.trim();
    const username = state.smtpUsername.trim();
    if (host.length > 0) values.smtpHost = state.smtpHost;
    if (port.length > 0) values.smtpPort = Number(port);
    if (state.smtpTlsMode) values.smtpTlsMode = state.smtpTlsMode;
    if (username.length > 0) values.smtpUsername = state.smtpUsername;
    if (state.smtpPassword.length > 0) {
      values.smtpPassword = state.smtpPassword;
    } else if (mode === "edit" && state.clearSmtpPassword) {
      values.clearSmtpPassword = true;
    }
  } else if (mode === "edit") {
    values.smtpHost = null;
    values.smtpPort = null;
    values.smtpTlsMode = null;
    values.smtpUsername = null;
    values.clearSmtpPassword = true;
  }

  if (state.imapEnabled) {
    const host = state.imapHost.trim();
    const port = state.imapPort.trim();
    if (host.length > 0) values.imapHost = state.imapHost;
    if (port.length > 0) values.imapPort = Number(port);
    if (state.imapTlsMode) values.imapTlsMode = state.imapTlsMode;

    if (!state.credentialsShared) {
      const username = state.imapUsername.trim();
      if (username.length > 0) values.imapUsername = state.imapUsername;
      if (state.imapPassword.length > 0) {
        values.imapPassword = state.imapPassword;
      } else if (mode === "edit" && state.clearImapPassword) {
        values.clearImapPassword = true;
      }
    }
  } else if (mode === "edit") {
    values.imapHost = null;
    values.imapPort = null;
    values.imapTlsMode = null;
    if (!state.credentialsShared) {
      values.imapUsername = null;
      values.clearImapPassword = true;
    }
  }

  return values;
}

/** True when the account has any SMTP configuration (drives the edit toggle). */
export function hasSmtpConfiguration(account: {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpTlsMode: EmailTlsMode | null;
  smtpUsername: string | null;
  smtpPasswordConfigured: boolean;
}): boolean {
  return (
    account.smtpHost !== null ||
    account.smtpPort !== null ||
    account.smtpTlsMode !== null ||
    account.smtpUsername !== null ||
    account.smtpPasswordConfigured
  );
}

/** True when the account has any separate IMAP configuration. */
export function hasImapConfiguration(account: {
  imapHost: string | null;
  imapPort: number | null;
  imapTlsMode: EmailTlsMode | null;
  imapUsername: string | null;
  imapPasswordConfigured: boolean;
}): boolean {
  return (
    account.imapHost !== null ||
    account.imapPort !== null ||
    account.imapTlsMode !== null ||
    account.imapUsername !== null ||
    account.imapPasswordConfigured
  );
}
