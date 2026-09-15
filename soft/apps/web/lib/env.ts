import "server-only";

/**
 * Server-only API configuration.
 *
 * These values must never be exposed to the browser: `INTERNAL_API_KEY` is a
 * service-to-service secret (see `apps/api/src/security/internal-api-key.guard.ts`).
 * Do not rename it with a `NEXT_PUBLIC_` prefix.
 */
export interface ApiConfig {
  baseUrl: string;
  apiKey: string | undefined;
}

export const DEFAULT_API_BASE_URL = "http://localhost:3003";

export function getApiConfig(): ApiConfig {
  const baseUrl = process.env.API_BASE_URL?.trim();
  const apiKey = process.env.INTERNAL_API_KEY?.trim();
  return {
    baseUrl: baseUrl && baseUrl.length > 0 ? baseUrl : DEFAULT_API_BASE_URL,
    apiKey: apiKey && apiKey.length > 0 ? apiKey : undefined,
  };
}

export function isApiConfigured(): boolean {
  return getApiConfig().apiKey !== undefined;
}
