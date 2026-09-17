import { describe, it, expect } from "vitest";
import {
  buildRunSummary,
  formatObservedAmount,
  isSinglePrice,
} from "./summary";
import type { CheckpointView } from "./checkpoint";
import type { ClaimRead, OfferingRead } from "./types";

const EMPTY_CHECKPOINT: CheckpointView = {
  present: false,
  notes: null,
  coverage: [],
  pendingFollowUps: [],
  malformedCoverage: 0,
  malformedFollowUps: 0,
};

function offering(overrides: Partial<OfferingRead>): OfferingRead {
  return {
    id: "o1",
    researchRunId: "run",
    companyText: null,
    companyLocationText: null,
    marketServedText: null,
    productText: null,
    applicationText: null,
    treatmentText: null,
    dimensionsText: null,
    priceText: null,
    priceAmountNumeric: null,
    priceCurrency: null,
    priceUnit: null,
    vatStatus: "UNKNOWN",
    priceBasis: "UNKNOWN",
    sampleKind: "UNKNOWN",
    matchType: "EXACT_MATCH",
    sourceReferenceId: "s1",
    evidenceId: "e1",
    claimId: null,
    fingerprint: "f",
    createdAt: "",
    updatedAt: "",
    evidence: {
      id: "e1",
      sourceReferenceId: "s1",
      researchRunId: "run",
      evidenceText: "obs",
      verificationStatus: "VERIFIED",
      retrievedAt: null,
      createdAt: "",
      updatedAt: "",
      source: {
        id: "s1",
        url: "https://example.invalid/a",
        title: "Source A",
        publisher: null,
        sourceType: null,
      },
    },
    ...overrides,
  };
}

function claim(overrides: Partial<ClaimRead>): ClaimRead {
  return {
    id: "c1",
    researchRunId: "run",
    type: "FACT",
    statement: "s",
    confidence: "HIGH",
    lifecycleStatus: "CURRENT",
    correctionReason: null,
    correctedAt: null,
    replacedByClaimId: null,
    createdAt: "",
    updatedAt: "",
    evidence: [],
    ...overrides,
  };
}

describe("run summary", () => {
  it("deduplicates companies by explicit name and never by source domain", () => {
    const summary = buildRunSummary(
      [
        offering({
          id: "o1",
          companyText: "WOB Timber GmbH",
          evidence: {
            ...offering({}).evidence,
            source: {
              id: "s1",
              url: "https://fordaq.invalid/x",
              title: "Fordaq listing",
              publisher: "Fordaq",
              sourceType: null,
            },
          },
        }),
        offering({ id: "o2", companyText: "wob  timber gmbh" }),
        offering({ id: "o3", companyText: "  Acme  Ltd " }),
      ],
      [],
      EMPTY_CHECKPOINT,
    );
    // Two distinct companies (WOB deduped; marketplace publisher not counted).
    expect(summary.companyCount).toBe(2);
    expect(summary.offerings.total).toBe(3);
  });

  it("groups prices by match type + currency + unit + VAT + basis + sample", () => {
    const summary = buildRunSummary(
      [
        offering({
          id: "ex1",
          companyText: "A",
          matchType: "EXACT_MATCH",
          priceText: "10 EUR/m3",
          priceAmountNumeric: 10,
          priceCurrency: "EUR",
          priceUnit: "m3",
          vatStatus: "INCLUDED",
          priceBasis: "RETAIL_LIST",
          sampleKind: "FULL_PRODUCT",
        }),
        offering({
          id: "ex2",
          companyText: "B",
          matchType: "EXACT_MATCH",
          priceText: "20 EUR/m3",
          priceAmountNumeric: 20,
          priceCurrency: "EUR",
          priceUnit: "m3",
          vatStatus: "INCLUDED",
          priceBasis: "RETAIL_LIST",
          sampleKind: "FULL_PRODUCT",
        }),
        offering({
          id: "sub1",
          companyText: "C",
          matchType: "SUBSTITUTE",
          priceText: "5 EUR/m3",
          priceAmountNumeric: 5,
          priceCurrency: "EUR",
          priceUnit: "m3",
          vatStatus: "INCLUDED",
          priceBasis: "RETAIL_LIST",
          sampleKind: "FULL_PRODUCT",
        }),
      ],
      [],
      EMPTY_CHECKPOINT,
    );
    expect(summary.pricedOfferingCount).toBe(3);
    // Substitutes are never combined with exact matches.
    expect(summary.priceGroups).toHaveLength(2);
    const exact = summary.priceGroups.find((g) => g.matchType === "EXACT_MATCH");
    expect(exact?.pricedCount).toBe(2);
    expect(exact?.lowest.amount).toBe(10);
    expect(exact?.highest.amount).toBe(20);
    expect(isSinglePrice(exact as NonNullable<typeof exact>)).toBe(false);
    const substitute = summary.priceGroups.find(
      (g) => g.matchType === "SUBSTITUTE",
    );
    expect(substitute?.lowest.amount).toBe(5);
    expect(substitute?.highest.amount).toBe(5);
    expect(isSinglePrice(substitute as NonNullable<typeof substitute>)).toBe(
      true,
    );
  });

  it("shows one value for a single price and links the offering + source", () => {
    const summary = buildRunSummary(
      [
        offering({
          id: "only",
          companyText: "Solo Co",
          matchType: "EXACT_MATCH",
          priceAmountNumeric: 12.5,
          priceCurrency: "EUR",
          priceUnit: "m2",
        }),
      ],
      [],
      EMPTY_CHECKPOINT,
    );
    const group = summary.priceGroups[0];
    expect(group?.pricedCount).toBe(1);
    expect(isSinglePrice(group as NonNullable<typeof group>)).toBe(true);
    expect(group?.lowest.offeringId).toBe("only");
    expect(group?.lowest.sourceUrl).toBe("https://example.invalid/a");
    expect(formatObservedAmount(group!.lowest)).toBe("12.5 EUR / m2");
  });

  it("counts price wording without a numeric amount (never as zero)", () => {
    const summary = buildRunSummary(
      [
        offering({
          id: "wording",
          companyText: "Words Co",
          priceText: "2.221,73 € pro m³",
          priceAmountNumeric: null,
        }),
      ],
      [],
      EMPTY_CHECKPOINT,
    );
    expect(summary.pricedOfferingCount).toBe(0);
    expect(summary.unstructuredPriceCount).toBe(1);
    expect(summary.noPriceRecordedCount).toBe(0);
    expect(summary.priceGroups).toHaveLength(0);
  });

  it("distinguishes 'price not structured yet' from 'no public price'", () => {
    const summary = buildRunSummary(
      [
        offering({ id: "none", companyText: "A", priceText: null }),
        offering({ id: "wording", companyText: "B", priceText: "Price on request" }),
        offering({
          id: "amount-no-unit",
          companyText: "C",
          priceAmountNumeric: 10,
          priceCurrency: "EUR",
          priceUnit: null,
        }),
      ],
      [],
      EMPTY_CHECKPOINT,
    );
    expect(summary.noPriceRecordedCount).toBe(1);
    expect(summary.unstructuredPriceCount).toBe(2);
    expect(summary.pricedOfferingCount).toBe(0);
  });

  it("keeps dimensions visible alongside a price extreme", () => {
    const summary = buildRunSummary(
      [
        offering({
          id: "dim",
          companyText: "Dim Co",
          productText: "Boards",
          dimensionsText: "52 mm",
          priceAmountNumeric: 55.45,
          priceCurrency: "EUR",
          priceUnit: "qm",
        }),
      ],
      [],
      EMPTY_CHECKPOINT,
    );
    expect(summary.priceGroups[0]?.lowest.dimensionsText).toBe("52 mm");
  });

  it("excludes correction-flagged and unclassified offerings from extrema", () => {
    const summary = buildRunSummary(
      [
        offering({
          id: "flagged",
          companyText: "Flagged Co",
          claimId: "c1",
          matchType: "EXACT_MATCH",
          priceAmountNumeric: 1,
          priceCurrency: "EUR",
          priceUnit: "m3",
        }),
        offering({
          id: "unclassified",
          companyText: "U Co",
          matchType: "UNKNOWN",
          priceAmountNumeric: 2,
          priceCurrency: "EUR",
          priceUnit: "m3",
        }),
      ],
      [claim({ id: "c1", lifecycleStatus: "REPLACED" })],
      EMPTY_CHECKPOINT,
    );
    expect(summary.priceGroups).toHaveLength(0);
    expect(summary.pricedOfferingCount).toBe(0);
    const reasons = summary.excludedFromPrices.map((entry) => entry.reason);
    expect(reasons.some((r) => r.includes("replaced, retracted"))).toBe(true);
    expect(reasons.some((r) => r.includes("classification not recorded"))).toBe(
      true,
    );
  });

  it("computes the gaps indication from the checkpoint", () => {
    const checkpoint: CheckpointView = {
      present: true,
      notes: null,
      coverage: [
        { targetMarketId: "m", dimension: "prices", status: "COVERED", note: null },
        { targetMarketId: "m", dimension: "buyers", status: "PARTIAL", note: null },
        { targetMarketId: "m", dimension: "channels", status: "GAP", note: null },
      ],
      pendingFollowUps: [
        { kind: "SOURCE", ref: "x", note: null },
        { kind: "COVERAGE", ref: "y", note: null },
      ],
      malformedCoverage: 0,
      malformedFollowUps: 0,
    };
    const summary = buildRunSummary([], [], checkpoint);
    expect(summary.gaps).toMatchObject({
      present: true,
      totalCells: 3,
      coveredCells: 1,
      partialCells: 1,
      gapCells: 1,
      pendingFollowUps: 2,
    });
    expect(summary.companyCount).toBe(0);
  });
});
