import type {
  ResearchContext,
  ResearchGoal,
  ResearchRequestParameters,
} from '@ai-sdr/contracts';

/**
 * Lightweight discovery row for a queued research request. Carries only enough
 * for a researcher to pick a request and derive product-specific vocabulary —
 * never a description or a supplied id.
 */
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

/** Full researcher intake: the persisted request parameters plus the product
 * context. The researcher needs nothing else — no prompt, file, or supplied id. */
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
    parameters: ResearchRequestParameters | null;
  };
  context: ResearchContext;
}
