import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ApiError } from "./client";
import { describeApiError } from "./errors";

describe("describeApiError", () => {
  it("maps the mailbox secret-storage 503 to an actionable, non-secret message", () => {
    const error = new ApiError("secrets_key_not_configured", {
      status: 503,
      code: "http_503",
    });
    const message = describeApiError(error, "fallback");
    expect(message).not.toBe("fallback");
    expect(message).toContain("EMAIL_SECRETS_KEY");
    expect(message).toContain("without a password");
    // Never echo the raw server code.
    expect(message).not.toContain("secrets_key_not_configured");
  });

  it("maps a generic 503 to a temporary-unavailable message", () => {
    const error = new ApiError("service_unavailable", {
      status: 503,
      code: "http_503",
    });
    expect(describeApiError(error, "fallback")).toBe(
      "The service is temporarily unavailable. Please try again.",
    );
  });

  it("keeps the fallback for unmapped failures", () => {
    const error = new ApiError("boom", { status: 500, code: "http_500" });
    expect(describeApiError(error, "fallback")).toBe("fallback");
  });

  it("maps mailbox configuration/credential errors to specific, safe messages", () => {
    const notConfigured = describeApiError(
      new ApiError("mailbox_not_configured", { status: 400, code: "http_400" }),
      "fallback",
    );
    expect(notConfigured).toContain("No SMTP/IMAP server settings");
    expect(notConfigured).not.toContain("mailbox_not_configured");

    expect(
      describeApiError(
        new ApiError("invalid_email_account_configuration", {
          status: 400,
          code: "http_400",
        }),
        "fallback",
      ),
    ).toContain("incomplete");

    const missingPassword = describeApiError(
      new ApiError("mailbox_credentials_missing", {
        status: 409,
        code: "http_409",
      }),
      "fallback",
    );
    expect(missingPassword).toContain("No password is stored");
    expect(missingPassword).not.toContain("mailbox_credentials_missing");

    // A generic 400 keeps the generic message.
    expect(
      describeApiError(
        new ApiError("nope", { status: 400, code: "http_400" }),
        "fallback",
      ),
    ).toBe("The API rejected the request as invalid.");
  });
});
