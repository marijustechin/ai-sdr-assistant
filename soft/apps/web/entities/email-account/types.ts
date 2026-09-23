/**
 * Read-only shapes returned by the internal email-account API.
 *
 * Passwords are never present; only `smtpPasswordConfigured` /
 * `imapPasswordConfigured` are exposed.
 */

export type EmailAccountStatus = "ACTIVE" | "DISABLED";
export type EmailTlsMode = "NONE" | "STARTTLS" | "SSL_TLS";

export interface EmailAccountRead {
  id: string;
  label: string;
  accountEmail: string;
  status: EmailAccountStatus;
  provider: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpTlsMode: EmailTlsMode | null;
  smtpUsername: string | null;
  smtpPasswordConfigured: boolean;
  imapHost: string | null;
  imapPort: number | null;
  imapTlsMode: EmailTlsMode | null;
  imapUsername: string | null;
  imapPasswordConfigured: boolean;
  credentialsShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAccountActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  account?: EmailAccountRead;
}
