import type { ResearchGoal } from "@ai-sdr/contracts";

/** Discovery row for a queued research request (mirrors the API response). */
export interface ResearchRequestSummary {
  runId: string;
  opportunityId: string;
  productId: string;
  productName: string;
  status: string;
  contextVersion: number;
  requestedAt: string;
  countries: string[];
  goals: ResearchGoal[];
}

/** Result of the submit server action. */
export type ResearchRequestActionResult =
  | { ok: true; request: ResearchRequestSummary }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Researcher intake payload (mirrors the API response). */
export interface ResearchRequestIntake {
  request: {
    runId: string;
    opportunityId: string;
    productId: string;
    productName: string;
    productCategory: string | null;
    productScientificName: string | null;
    offerId: string;
    offerName: string;
    status: string;
    contextVersion: number;
    requestedAt: string;
    targetMarketIds: string[];
    parameters: unknown;
  };
  context: unknown;
}
