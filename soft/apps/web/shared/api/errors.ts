import { ApiError } from "./client";

/**
 * Translate a failed API call into a short, admin-friendly message. Backend
 * error bodies, secrets, and internal exceptions are never surfaced verbatim.
 */
export function describeApiError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case "api_key_missing":
      return "The internal API key is not configured for this environment.";
    case "api_unreachable":
    case "api_timeout":
      return "The API is unavailable. Confirm the API service is running and reachable.";
    case "http_401":
      return "The internal API key was rejected by the API.";
    case "http_400":
      if (error.message.includes("mailbox_not_configured")) {
        return "No SMTP/IMAP server settings are configured for this mailbox.";
      }
      if (error.message.includes("imap_not_configured")) {
        return "No IMAP server settings are configured for this mailbox.";
      }
      if (error.message.includes("smtp_not_configured")) {
        return "No SMTP server settings are configured for this mailbox.";
      }
      if (error.message.includes("invalid_email_account_configuration")) {
        return "The mailbox server settings are incomplete: set host, port and TLS mode together.";
      }
      return "The API rejected the request as invalid.";
    case "http_404":
      return "The requested item was not found.";
    case "http_409":
      if (error.message.includes("mailbox_credentials_missing")) {
        return "No password is stored for this mailbox. Save a password, then verify again.";
      }
      return fallback;
    case "http_503":
      if (error.message.includes("secrets_key_not_configured")) {
        return "Saving a mailbox password requires the server's encryption key (EMAIL_SECRETS_KEY) to be configured. You can still save the account without a password.";
      }
      return "The service is temporarily unavailable. Please try again.";
    default:
      return fallback;
  }
}

/** True when the API call failed because no internal key is configured. */
export function isApiKeyMissingError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "api_key_missing";
}
