import { describe, it, expect } from "vitest";
import { accountOptions, transportSummary } from "./display";
import type { EmailAccountRead } from "./types";

function account(
  overrides: Partial<EmailAccountRead> = {},
): EmailAccountRead {
  return {
    id: "a1",
    label: "Acme Mail",
    accountEmail: "mail@acme.invalid",
    status: "ACTIVE",
    authKind: "PASSWORD",
    provider: null,
    smtpHost: null,
    smtpPort: null,
    smtpTlsMode: null,
    smtpUsername: null,
    smtpPasswordConfigured: false,
    imapHost: null,
    imapPort: null,
    imapTlsMode: null,
    imapUsername: null,
    imapPasswordConfigured: false,
    credentialsShared: false,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("email account display helpers", () => {
  it("summarizes transport without ever including a secret", () => {
    const empty = transportSummary(account());
    expect(empty).toContain("SMTP not configured");
    expect(empty).toContain("IMAP not configured");

    const configured = transportSummary(
      account({
        smtpHost: "smtp.acme.invalid",
        smtpPort: 587,
        smtpTlsMode: "STARTTLS",
        smtpUsername: "mail@acme.invalid",
        smtpPasswordConfigured: true,
        imapHost: "imap.acme.invalid",
        imapPort: 993,
        imapTlsMode: "SSL_TLS",
        imapPasswordConfigured: true,
      }),
    );
    expect(configured).toBe(
      "SMTP smtp.acme.invalid:587 · STARTTLS · password set · IMAP imap.acme.invalid:993 · SSL_TLS · password set",
    );
    expect(configured).not.toContain("synthetic");
  });

  it("notes shared SMTP credentials for IMAP", () => {
    const summary = transportSummary(
      account({
        credentialsShared: true,
        smtpHost: "smtp.acme.invalid",
        smtpPort: 587,
        smtpTlsMode: "STARTTLS",
        smtpPasswordConfigured: true,
        imapHost: "imap.acme.invalid",
        imapPort: 993,
        imapTlsMode: "SSL_TLS",
      }),
    );
    expect(summary).toContain("shared SMTP credentials");
  });

  it("marks disabled accounts as disabled options", () => {
    const options = accountOptions([
      account({ id: "a" }),
      account({ id: "b", status: "DISABLED" }),
    ]);
    expect(options).toEqual([
      { id: "a", label: "Acme Mail", disabled: false },
      { id: "b", label: "Acme Mail", disabled: true },
    ]);
  });
});
