import { describe, it, expect } from "vitest";
import { mailboxSummary, profileOptions } from "./display";
import type { SenderProfileRead } from "./types";

function profile(overrides: Partial<SenderProfileRead> = {}): SenderProfileRead {
  return {
    id: "p1",
    label: "Acme Sales",
    senderName: "Jane Doe",
    senderTitle: null,
    companyName: "Acme Timber",
    fromEmail: "jane@acme.invalid",
    replyToEmail: null,
    phone: null,
    website: null,
    whatsappEnabled: false,
    whatsappPhone: null,
    logoUrl: null,
    includeLogoInSignature: false,
    signature: null,
    status: "ACTIVE",
    emailAccountId: null,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("sender profile display helpers", () => {
  it("summarizes the mailbox reference without any credential", () => {
    expect(mailboxSummary(null, [])).toBe("No mailbox connection");
    expect(
      mailboxSummary("a1", [{ id: "a1", label: "Acme Mail" }]),
    ).toBe("Mailbox: Acme Mail");
    expect(mailboxSummary("missing", [])).toBe("Mailbox: unknown account");
  });

  it("marks disabled profiles as disabled options", () => {
    const options = profileOptions([
      profile({ id: "a" }),
      profile({ id: "b", status: "DISABLED" }),
    ]);
    expect(options).toEqual([
      { id: "a", label: "Acme Sales", disabled: false },
      { id: "b", label: "Acme Sales", disabled: true },
    ]);
  });
});
