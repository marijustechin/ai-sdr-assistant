import { describe, it, expect } from "vitest";
import {
  MARKET_RESEARCH_STATE_LABEL,
  MARKET_RESEARCH_STATE_TONE,
  MATCH_CONFIDENCE_LABEL,
  QUOTE_FIELD_LABEL,
} from "./display";

describe("quote collection display helpers", () => {
  it("labels every market-research price state", () => {
    expect(MARKET_RESEARCH_STATE_LABEL.PRICE_INQUIRY_PREPARED).toBe(
      "Price inquiry prepared",
    );
    expect(MARKET_RESEARCH_STATE_LABEL.AWAITING_REPLY).toContain("Awaiting");
    expect(MARKET_RESEARCH_STATE_LABEL.NO_RESPONSE).toContain("No response");
    expect(MARKET_RESEARCH_STATE_TONE.QUOTE_EXTRACTED).toBe("success");
  });

  it("labels match confidence without overstating a fallback", () => {
    expect(MATCH_CONFIDENCE_LABEL.HEADER).toContain("headers");
    expect(MATCH_CONFIDENCE_LABEL.FALLBACK).toContain("sender/subject/time");
    expect(QUOTE_FIELD_LABEL.priceAmount).toBe("Amount");
    expect(QUOTE_FIELD_LABEL.vatIncluded).toBe("VAT included");
  });
});
