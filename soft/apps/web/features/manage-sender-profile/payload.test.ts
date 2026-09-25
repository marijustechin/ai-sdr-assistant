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
    senderTitle: "",
    companyName: "PremiumTimberHub",
    fromEmail: "sales@premiumtimberhub.eu",
    replyToEmail: "",
    phone: "",
    website: "",
    whatsappEnabled: false,
    whatsappPhone: "",
    logoUrl: "",
    includeLogoInSignature: false,
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
      whatsappEnabled: false,
      includeLogoInSignature: false,
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

  it("accepts a profile without company or title (omits both on create)", () => {
    const payload = buildSenderProfilePayload(
      state({ senderTitle: "", companyName: "" }),
      "create",
    );
    expect(payload).toEqual({
      label: "Sales PremiumTimberHub",
      senderName: "Albert Scout",
      fromEmail: "sales@premiumtimberhub.eu",
      whatsappEnabled: false,
      includeLogoInSignature: false,
    });
    expect(payload).not.toHaveProperty("companyName");
    expect(payload).not.toHaveProperty("senderTitle");
  });

  it("includes an optional role/title when provided", () => {
    const payload = buildSenderProfilePayload(
      state({ senderTitle: "Sourcing & Procurement" }),
      "create",
    );
    expect(payload.senderTitle).toBe("Sourcing & Procurement");
  });

  it("clears optional company/title on edit when blank", () => {
    const payload = buildSenderProfilePayload(
      state({ senderTitle: "", companyName: "" }),
      "edit",
    );
    expect(payload.companyName).toBeNull();
    expect(payload.senderTitle).toBeNull();
  });

  it("includes structured phone and website when provided", () => {
    const payload = buildSenderProfilePayload(
      state({ phone: "+370 600 00000", website: "https://acme.invalid" }),
      "create",
    );
    expect(payload.phone).toBe("+370 600 00000");
    expect(payload.website).toBe("https://acme.invalid");
  });

  it("omits phone/website on create and clears them explicitly on edit", () => {
    const created = buildSenderProfilePayload(state(), "create");
    expect(created).not.toHaveProperty("phone");
    expect(created).not.toHaveProperty("website");

    const edited = buildSenderProfilePayload(state(), "edit");
    expect(edited.phone).toBeNull();
    expect(edited.website).toBeNull();
  });

  it("includes the WhatsApp flag, omitting a blank dedicated number (main-phone fallback)", () => {
    const payload = buildSenderProfilePayload(
      state({ phone: "+370 600 00000", whatsappEnabled: true }),
      "create",
    );
    expect(payload.whatsappEnabled).toBe(true);
    expect(payload).not.toHaveProperty("whatsappPhone");
  });

  it("includes a dedicated WhatsApp number when provided", () => {
    const payload = buildSenderProfilePayload(
      state({ whatsappEnabled: true, whatsappPhone: "+370 600 00001" }),
      "create",
    );
    expect(payload.whatsappEnabled).toBe(true);
    expect(payload.whatsappPhone).toBe("+370 600 00001");
  });

  it("defaults WhatsApp off and clears the dedicated number on edit", () => {
    const created = buildSenderProfilePayload(state(), "create");
    expect(created.whatsappEnabled).toBe(false);

    const edited = buildSenderProfilePayload(state(), "edit");
    expect(edited.whatsappEnabled).toBe(false);
    expect(edited.whatsappPhone).toBeNull();
  });

  it("defaults logo off and omits the URL on create", () => {
    const payload = buildSenderProfilePayload(state(), "create");
    expect(payload.includeLogoInSignature).toBe(false);
    expect(payload).not.toHaveProperty("logoUrl");
  });

  it("includes the logo URL only when provided, and clears it on edit", () => {
    const payload = buildSenderProfilePayload(
      state({
        includeLogoInSignature: true,
        logoUrl: "https://acme.invalid/logo.png",
      }),
      "create",
    );
    expect(payload.includeLogoInSignature).toBe(true);
    expect(payload.logoUrl).toBe("https://acme.invalid/logo.png");

    const edited = buildSenderProfilePayload(state(), "edit");
    expect(edited.logoUrl).toBeNull();
  });
});
