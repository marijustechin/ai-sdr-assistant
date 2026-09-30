import { describe, expect, it } from "vitest";
import {
  OUTREACH_CLASSIFICATION_LABEL,
  isPositiveClassification,
  type OutreachReplyClassification,
} from "./index";

describe("outreach result classification display", () => {
  const all: OutreachReplyClassification[] = [
    "INTERESTED",
    "PRICE_REQUEST",
    "MORE_INFO",
    "NOT_INTERESTED",
    "WRONG_CONTACT",
    "OUT_OF_OFFICE",
    "OTHER",
  ];

  it("has a label for every classification", () => {
    for (const value of all) {
      expect(OUTREACH_CLASSIFICATION_LABEL[value]).toBeTruthy();
    }
  });

  it("treats only the commercial positives as positive (handoff)", () => {
    expect(isPositiveClassification("INTERESTED")).toBe(true);
    expect(isPositiveClassification("PRICE_REQUEST")).toBe(true);
    expect(isPositiveClassification("MORE_INFO")).toBe(true);
    expect(isPositiveClassification("NOT_INTERESTED")).toBe(false);
    expect(isPositiveClassification("WRONG_CONTACT")).toBe(false);
    expect(isPositiveClassification("OUT_OF_OFFICE")).toBe(false);
    expect(isPositiveClassification("OTHER")).toBe(false);
    expect(isPositiveClassification(null)).toBe(false);
  });
});
