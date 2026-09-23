import { describe, it, expect } from "vitest";
import {
  errorVerification,
  IDLE_VERIFICATION,
  isVerificationSuccess,
  pendingVerification,
  successVerification,
  VERIFIED_BUTTON_CLASS,
  verificationButtonView,
  verificationDetail,
} from "./verification-state";

describe("verification state", () => {
  it("is idle by default: neutral button, no message", () => {
    const view = verificationButtonView(IDLE_VERIFICATION, "smtp");
    expect(view).toMatchObject({
      label: "Verify SMTP login",
      disabled: false,
      variant: "outline",
    });
    expect(view.className).not.toContain(VERIFIED_BUTTON_CLASS);
    expect(verificationDetail(IDLE_VERIFICATION)).toBeNull();
  });

  it("is pending: button disabled with a Verifying label and no message", () => {
    const state = pendingVerification();
    const smtp = verificationButtonView(state, "smtp");
    const imap = verificationButtonView(state, "imap");
    expect(smtp).toMatchObject({ label: "Verifying…", disabled: true });
    expect(imap).toMatchObject({ label: "Verifying…", disabled: true });
    expect(verificationDetail(state)).toBeNull();
  });

  it("is success: emerald button, verified label, and the detail", () => {
    const state = successVerification("SMTP authenticated (mail:587).");
    const smtp = verificationButtonView(state, "smtp");
    expect(smtp).toMatchObject({ label: "SMTP verified", disabled: false });
    expect(smtp.className).toContain("bg-emerald-300");
    expect(verificationButtonView(state, "imap").label).toBe("IMAP verified");
    expect(verificationDetail(state)).toBe("SMTP authenticated (mail:587).");
    expect(isVerificationSuccess(state)).toBe(true);
  });

  it("is error: destructive button and the safe detail", () => {
    const state = errorVerification("SMTP verification failed (EAUTH).");
    const view = verificationButtonView(state, "smtp");
    expect(view).toMatchObject({
      label: "Verify SMTP login",
      disabled: false,
      variant: "destructive",
    });
    expect(view.className).not.toContain("bg-emerald-300");
    expect(verificationDetail(state)).toBe(
      "SMTP verification failed (EAUTH).",
    );
    expect(isVerificationSuccess(state)).toBe(false);
  });

  it("keeps SMTP and IMAP states independent", () => {
    const smtpError = errorVerification("SMTP verification failed (EAUTH).");
    // IMAP is still idle, so its button is unaffected by the SMTP error.
    const imapIdle = verificationButtonView(IDLE_VERIFICATION, "imap");
    expect(imapIdle).toMatchObject({
      label: "Verify IMAP access",
      variant: "outline",
    });
    expect(
      verificationButtonView(smtpError, "smtp").variant,
    ).toBe("destructive");
    // The send channel is also independent.
    expect(verificationButtonView(IDLE_VERIFICATION, "send").label).toBe(
      "Send test message",
    );
  });
});
