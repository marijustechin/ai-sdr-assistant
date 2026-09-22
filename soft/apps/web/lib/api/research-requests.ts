import "server-only";
import type { CreateResearchRequestInput } from "@ai-sdr/contracts";
import { apiRequest } from "@shared/api/client";
import type {
  ResearchRequestIntake,
  ResearchRequestSummary,
} from "@/lib/research-requests/types";

/**
 * Server-only calls for the product-independent market research request flow.
 * The internal API key is attached by `apiRequest` and never reaches the
 * browser.
 */

/** POST /research-requests — submit a request (idempotent via `requestKey`). */
export async function submitResearchRequest(
  input: CreateResearchRequestInput,
): Promise<ResearchRequestSummary> {
  return apiRequest<ResearchRequestSummary>("/research-requests", {
    method: "POST",
    body: input,
  });
}

/** GET /research-requests?status=QUEUED — requests waiting for a researcher. */
export async function listQueuedResearchRequests(): Promise<
  ResearchRequestSummary[]
> {
  return apiRequest<ResearchRequestSummary[]>(
    "/research-requests?status=QUEUED",
    { method: "GET" },
  );
}

/** GET /research-requests/:runId — persisted parameters + product context. */
export async function getResearchRequestIntake(
  runId: string,
): Promise<ResearchRequestIntake> {
  return apiRequest<ResearchRequestIntake>(
    `/research-requests/${encodeURIComponent(runId)}`,
    { method: "GET" },
  );
}
