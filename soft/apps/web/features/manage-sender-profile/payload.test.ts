import { describe, it, expect } from "vitest";
import {
  buildSenderProfilePayload,
  type SenderProfileFormState,
} from "./payload";

function state(
  overrides: Partial<SenderProfileFormState> = {},
): SenderProfileFormState {
  return {
    label: "Sales PremiumTimberHub",
    senderName: "Albert Scout",
    companyName: "PremiumTimberHub",
    fromEmail: "sales@premiumtimberhub.eu",
    replyToEmail: "",
    signature: "",
    status: "ACTIVE",
    emailAccountId: "",
    ...overrides,
  };
}

describe("buildSenderProfilePayload", () => {
  it("creates an identity-only payload with no mailbox reference", () => {
    expect(buildSenderProfilePayload(state(), "create")).toEqual({
      label: "Sales PremiumTimberHub",
      senderName: "Albert Scout",
      companyName: "PremiumTimberHub",
      fromEmail: "sales@premiumtimberhub.eu",
    });
  });

  it("includes a chosen mailbox connection", () => {
    const payload = buildSenderProfilePayload(
      state({ emailAccountId: "11111111-1111-4111-8111-111111111111" }),
      "create",
    );
    expect(payload.emailAccountId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("clears the mailbox reference explicitly on edit", () => {
    const payload = buildSenderProfilePayload(state(), "edit");
    expect(payload.status).toBe("ACTIVE");
    expect(payload.emailAccountId).toBeNull();
  });

  it("never includes transport credential fields", () => {
    const payload = buildSenderProfilePayload(state(), "create");
    for (const key of Object.keys(payload)) {
      expect(key).not.toMatch(/smtp|imap|password/i);
    }
  });
});
