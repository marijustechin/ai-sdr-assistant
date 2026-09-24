import "server-only";
import { apiRequest } from "@shared/api/client";
import type { QuoteCollectionItemRead } from "./types";

/** Server-only read for the market-research quote collection. */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function listQuoteCollection(
  opportunityId: string,
  leadId: string,
): Promise<QuoteCollectionItemRead[]> {
  return apiRequest<QuoteCollectionItemRead[]>(
    `/opportunities/${enc(opportunityId)}/leads/${enc(leadId)}/quote-collection`,
    { method: "GET" },
  );
}
