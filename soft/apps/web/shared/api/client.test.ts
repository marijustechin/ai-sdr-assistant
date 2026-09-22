import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ApiError, apiRequest } from "./client";
import { describeApiError } from "./errors";

const originalKey = process.env.INTERNAL_API_KEY;

beforeEach(() => {
  process.env.INTERNAL_API_KEY = "integration-test-internal-key-0001";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) {
    delete process.env.INTERNAL_API_KEY;
  } else {
    process.env.INTERNAL_API_KEY = originalKey;
  }
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("apiRequest failure mapping", () => {
  it("fails closed when no internal key is configured", async () => {
    delete process.env.INTERNAL_API_KEY;
    await expect(apiRequest("/products")).rejects.toMatchObject({
      code: "api_key_missing",
    });
  });

  it("maps an HTTP 401 to a non-sensitive http_401 error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { error: "unauthorized" })),
    );
    await expect(apiRequest("/products")).rejects.toMatchObject({
      status: 401,
      code: "http_401",
    });
  });

  it("maps a timeout to api_timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      }),
    );
    await expect(apiRequest("/products")).rejects.toMatchObject({
      code: "api_timeout",
    });
  });

  it("maps an unreachable API to api_unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(apiRequest("/products")).rejects.toMatchObject({
      code: "api_unreachable",
    });
  });
});

describe("describeApiError", () => {
  it("translates API failures into admin-friendly messages", () => {
    expect(describeApiError(new ApiError("x", { code: "api_key_missing" }), "f")).toMatch(
      /api key/i,
    );
    expect(describeApiError(new ApiError("x", { code: "api_timeout" }), "f")).toMatch(
      /unavailable/i,
    );
    expect(
      describeApiError(new ApiError("x", { status: 401, code: "http_401" }), "f"),
    ).toMatch(/rejected/i);
    expect(
      describeApiError(new ApiError("x", { status: 404, code: "http_404" }), "f"),
    ).toMatch(/not found/i);
  });

  it("falls back without exposing the raw error", () => {
    expect(describeApiError(new Error("secret stack"), "Friendly fallback.")).toBe(
      "Friendly fallback.",
    );
  });
});
