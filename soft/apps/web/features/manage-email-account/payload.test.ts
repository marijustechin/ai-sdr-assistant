import { describe, it, expect } from "vitest";
import {
  buildEmailAccountPayload,
  hasImapConfiguration,
  hasSmtpConfiguration,
  type EmailAccountFormState,
} from "./payload";

function state(
  overrides: Partial<EmailAccountFormState> = {},
): EmailAccountFormState {
  return {
    label: "Acme Mail",
    accountEmail: "mail@acme.invalid",
    status: "ACTIVE",
    authKind: "PASSWORD",
    provider: "",
    credentialsShared: false,
    smtpEnabled: false,
    smtpHost: "",
    smtpPort: "",
    smtpTlsMode: "",
    smtpUsername: "",
    smtpPassword: "",
    clearSmtpPassword: false,
    imapEnabled: false,
    imapHost: "",
    imapPort: "",
    imapTlsMode: "",
    imapUsername: "",
    imapPassword: "",
    clearImapPassword: false,
    ...overrides,
  };
}

describe("buildEmailAccountPayload", () => {
  it("omits transport fields entirely on create while toggles are off", () => {
    const payload = buildEmailAccountPayload(state(), "create");
    expect(payload).toEqual({
      label: "Acme Mail",
      accountEmail: "mail@acme.invalid",
      authKind: "PASSWORD",
      credentialsShared: false,
    });
  });

  it("omits an autofilled password and all SMTP/IMAP fields while off", () => {
    const payload = buildEmailAccountPayload(
      state({
        smtpPassword: "browser-autofilled-secret",
        smtpHost: "smtp.autofilled.invalid",
        imapPassword: "browser-autofilled-secret",
        imapHost: "imap.autofilled.invalid",
      }),
      "create",
    );
    expect(payload).not.toHaveProperty("smtpPassword");
    expect(payload).not.toHaveProperty("smtpHost");
    expect(payload).not.toHaveProperty("imapPassword");
    expect(payload).not.toHaveProperty("imapHost");
    expect(JSON.stringify(payload)).not.toContain("browser-autofilled-secret");
  });

  it("includes transport fields and passwords only when enabled", () => {
    const payload = buildEmailAccountPayload(
      state({
        smtpEnabled: true,
        smtpHost: "smtp.acme.invalid",
        smtpPort: "587",
        smtpTlsMode: "STARTTLS",
        smtpUsername: "mail@acme.invalid",
        smtpPassword: "synthetic-smtp",
        imapEnabled: true,
        imapHost: "imap.acme.invalid",
        imapPort: "993",
        imapTlsMode: "SSL_TLS",
        imapUsername: "mail@acme.invalid",
        imapPassword: "synthetic-imap",
      }),
      "create",
    );
    expect(payload).toMatchObject({
      smtpHost: "smtp.acme.invalid",
      smtpPort: 587,
      smtpTlsMode: "STARTTLS",
      smtpUsername: "mail@acme.invalid",
      smtpPassword: "synthetic-smtp",
      imapHost: "imap.acme.invalid",
      imapPort: 993,
      imapTlsMode: "SSL_TLS",
      imapUsername: "mail@acme.invalid",
      imapPassword: "synthetic-imap",
    });
  });

  it("omits separate IMAP credentials when shared with SMTP", () => {
    const payload = buildEmailAccountPayload(
      state({
        credentialsShared: true,
        smtpEnabled: true,
        smtpHost: "smtp.acme.invalid",
        smtpPort: "587",
        smtpTlsMode: "STARTTLS",
        smtpUsername: "mail@acme.invalid",
        smtpPassword: "synthetic-smtp",
        imapEnabled: true,
        imapHost: "imap.acme.invalid",
        imapPort: "993",
        imapTlsMode: "SSL_TLS",
        imapUsername: "imap@acme.invalid",
        imapPassword: "synthetic-imap",
      }),
      "create",
    );
    expect(payload.credentialsShared).toBe(true);
    expect(payload.imapHost).toBe("imap.acme.invalid");
    expect(payload).not.toHaveProperty("imapUsername");
    expect(payload).not.toHaveProperty("imapPassword");
  });

  it("clears a transport explicitly on edit when its toggle is turned off", () => {
    const payload = buildEmailAccountPayload(
      state({ status: "ACTIVE" }),
      "edit",
    );
    expect(payload.status).toBe("ACTIVE");
    expect(payload.smtpHost).toBeNull();
    expect(payload.smtpPort).toBeNull();
    expect(payload.smtpTlsMode).toBeNull();
    expect(payload.smtpUsername).toBeNull();
    expect(payload.clearSmtpPassword).toBe(true);
    expect(payload.imapHost).toBeNull();
    expect(payload.clearImapPassword).toBe(true);
  });

  it("preserves a password on edit, replaces explicitly, and clears explicitly", () => {
    const preserve = buildEmailAccountPayload(
      state({
        smtpEnabled: true,
        smtpHost: "smtp.acme.invalid",
        smtpPort: "587",
        smtpTlsMode: "NONE",
        smtpUsername: "mail@acme.invalid",
      }),
      "edit",
    );
    expect(preserve).not.toHaveProperty("smtpPassword");
    expect(preserve).not.toHaveProperty("clearSmtpPassword");

    const replace = buildEmailAccountPayload(
      state({ smtpEnabled: true, smtpPassword: "new-secret" }),
      "edit",
    );
    expect(replace.smtpPassword).toBe("new-secret");
    expect(replace).not.toHaveProperty("clearSmtpPassword");

    const clear = buildEmailAccountPayload(
      state({ smtpEnabled: true, smtpPassword: "", clearSmtpPassword: true }),
      "edit",
    );
    expect(clear.clearSmtpPassword).toBe(true);
    expect(clear).not.toHaveProperty("smtpPassword");
  });
});

describe("transport configuration detectors", () => {
  it("detects any SMTP/IMAP configuration", () => {
    expect(
      hasSmtpConfiguration({
        smtpHost: null,
        smtpPort: null,
        smtpTlsMode: null,
        smtpUsername: null,
        smtpPasswordConfigured: false,
      }),
    ).toBe(false);
    expect(
      hasImapConfiguration({
        imapHost: null,
        imapPort: null,
        imapTlsMode: null,
        imapUsername: null,
        imapPasswordConfigured: true,
      }),
    ).toBe(true);
  });
});
