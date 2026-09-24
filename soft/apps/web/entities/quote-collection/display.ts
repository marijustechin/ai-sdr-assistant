import type {
  MarketResearchPriceState,
  QuoteMatchConfidence,
} from "./types";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "outline";

/** Market-research price state labels (a view over the RFQ lifecycle). */
export const MARKET_RESEARCH_STATE_LABEL: Record<
  MarketResearchPriceState,
  string
> = {
  PRICE_INQUIRY_PREPARED: "Price inquiry prepared",
  AWAITING_REPLY: "Awaiting supplier reply",
  REPLY_RECEIVED: "Reply received",
  QUOTE_EXTRACTED: "Quote extracted",
  NO_RESPONSE: "No response yet",
};

export const MARKET_RESEARCH_STATE_TONE: Record<
  MarketResearchPriceState,
  BadgeTone
> = {
  PRICE_INQUIRY_PREPARED: "info",
  AWAITING_REPLY: "warning",
  REPLY_RECEIVED: "info",
  QUOTE_EXTRACTED: "success",
  NO_RESPONSE: "neutral",
};

export const MATCH_CONFIDENCE_LABEL: Record<QuoteMatchConfidence, string> = {
  HEADER: "Matched by message headers",
  FALLBACK: "Matched by sender/subject/time",
  NONE: "Not matched",
};

/** The structured quote fields we display, in a stable order. */
export const QUOTE_FIELDS = [
  "priceText",
  "priceAmount",
  "currency",
  "priceUnit",
  "moqText",
  "incoterm",
  "loadingLocationText",
  "leadTimeText",
  "validityText",
  "vatIncluded",
  "qualificationText",
] as const;

export type QuoteField = (typeof QUOTE_FIELDS)[number];

export const QUOTE_FIELD_LABEL: Record<QuoteField, string> = {
  priceText: "Price (as quoted)",
  priceAmount: "Amount",
  currency: "Currency",
  priceUnit: "Unit",
  moqText: "MOQ",
  incoterm: "Incoterm",
  loadingLocationText: "Loading / dispatch",
  leadTimeText: "Lead time",
  validityText: "Validity",
  vatIncluded: "VAT included",
  qualificationText: "Qualification / deviation",
};
