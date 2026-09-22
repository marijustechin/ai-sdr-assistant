import "server-only";
import type { DashboardSummary } from "@ai-sdr/contracts";
import { apiRequest } from "@shared/api/client";

/**
 * GET /dashboard/summary — read-only aggregate counts. Server-only: the internal
 * API key is attached by `apiRequest` and never reaches the browser.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/summary", { method: "GET" });
}
