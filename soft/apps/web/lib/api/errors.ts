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
      return "The API rejected the request as invalid.";
    case "http_404":
      return "The requested product was not found.";
    default:
      return fallback;
  }
}

/** True when the API call failed because no internal key is configured. */
export function isApiKeyMissingError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "api_key_missing";
}
