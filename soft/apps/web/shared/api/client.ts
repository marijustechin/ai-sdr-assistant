import "server-only";
import { getApiConfig } from "../config/env";

/** Error raised for any failed API interaction, with a machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    options: { status?: number; code?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code ?? "api_error";
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
}

function describeErrorBody(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const body = value as ApiErrorBody;
  if (typeof body.message === "string" && body.message.length > 0) {
    return body.message;
  }
  if (typeof body.error === "string" && body.error.length > 0) {
    return body.error;
  }
  return undefined;
}

/**
 * Minimal typed JSON client for the internal API.
 *
 * Server-only: it attaches the `x-internal-api-key` header, which must never
 * reach the browser. Every caller runs inside a Server Component, Server
 * Action, or route handler.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { baseUrl, apiKey } = getApiConfig();

  if (!apiKey) {
    throw new ApiError(
      "INTERNAL_API_KEY is not configured for the web app, so business endpoints cannot be called.",
      { code: "api_key_missing" },
    );
  }

  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  const timeoutMs = options.timeoutMs ?? 5000;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "content-type": "application/json",
        "x-internal-api-key": apiKey,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError(`The API did not respond within ${timeoutMs}ms.`, {
        code: "api_timeout",
      });
    }
    throw new ApiError(`Could not reach the API at ${baseUrl}.`, {
      code: "api_unreachable",
    });
  }

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    throw new ApiError(
      describeErrorBody(payload) ?? `The API returned HTTP ${response.status}.`,
      { status: response.status, code: `http_${response.status}` },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
