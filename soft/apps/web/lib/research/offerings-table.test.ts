import { describe, expect, it } from "vitest";
import {
  buildOfferingTableGroups,
  offeringRowCells,
  toggleExpandedRow,
  UNKNOWN_CELL,
} from "./offerings-table";
import type { ClaimRead, OfferingRead } from "./types";

function offering(overrides: Partial<OfferingRead>): OfferingRead {
  return {
    id: "o1",
    researchRunId: "run-1",
    companyText: "Coyletimber Ltd",
    companyLocationText: "GB",
    marketServedText: "GB",
    productText: "Thermo Ayous Cladding",
    applicationText: "exterior/facade cladding",
    treatmentText: "thermal modification",
    dimensionsText: null,
    priceText: "GBP 7.00 per metre excluding VAT",
    priceAmountNumeric: null,
    priceCurrency: "GBP",
    priceUnit: "per metre",
    vatStatus: "EXCLUDED",
    priceBasis: "RETAIL_LIST",
    sampleKind: "FULL_PRODUCT",
    matchType: "EXACT_MATCH",
    sourceReferenceId: "src-1",
    evidenceId: "ev-1",
    claimId: null,
    fingerprint: "f1",
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    evidence: {
      id: "ev-1",
      sourceReferenceId: "src-1",
      researchRunId: "run-1",
      evidenceText: "Recorded observation.",
      verificationStatus: "VERIFIED",
      retrievedAt: "2026-09-15T09:00:00.000Z",
      createdAt: "2026-09-15T09:00:00.000Z",
      updatedAt: "2026-09-15T09:00:00.000Z",
      source: {
        id: "src-1",
        url: "https://example.invalid/a",
        title: "A",
        publisher: "Example",
        sourceType: "supplier-product-page",
      },
    },
    ...overrides,
  };
}

const blank = offering({
  id: "blank",
  companyText: null,
  productText: null,
  companyLocationText: null,
  marketServedText: null,
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
  matchType: "SUBSTITUTE",
});

describe("offering table view model", () => {
  it("builds one row of cells per offering", () => {
    const offerings = [offering({ id: "a" }), blank];
    const groups = buildOfferingTableGroups(
      offerings,
      new Map<string, ClaimRead>(),
      new Map(),
    );
    const rows = groups.flatMap((group) => group.rows);
    expect(rows).toHaveLength(offerings.length);
    expect(rows.map((row) => row.offering.id)).toEqual(["a", "blank"]);
  });

  it("renders unknown fields as — and never infers them", () => {
    const cells = offeringRowCells(blank);
    expect(cells.company).toBe(UNKNOWN_CELL);
    expect(cells.product).toBe(UNKNOWN_CELL);
    expect(cells.price).toBe(UNKNOWN_CELL);
    expect(cells.unit).toBe(UNKNOWN_CELL);
    expect(cells.vat).toBe(UNKNOWN_CELL);
    expect(cells.market).toBe(UNKNOWN_CELL);
    // No structured stock/availability field exists, so it is never filled in.
    expect(cells.stock).toBe(UNKNOWN_CELL);
  });

  it("keeps price and unit independent", () => {
    const complete = offeringRowCells(offering({ id: "a" }));
    expect(complete.price).toBe("GBP 7.00 per metre excluding VAT");
    expect(complete.unit).toBe("per metre");

    const unitMissing = offeringRowCells(
      offering({ id: "b", priceText: "POA", priceUnit: null }),
    );
    expect(unitMissing.price).toBe("POA");
    expect(unitMissing.unit).toBe(UNKNOWN_CELL);
  });

  it("preserves the recorded exact/adjacent/substitute classification", () => {
    expect(offeringRowCells(offering({ id: "a" })).matchType).toBe(
      "EXACT_MATCH",
    );
    expect(offeringRowCells(blank).matchType).toBe("SUBSTITUTE");
  });

  it("keeps vat recorded values and maps unrecorded vat to —", () => {
    const included = offeringRowCells(
      offering({ id: "a", vatStatus: "INCLUDED" }),
    );
    expect(included.vat).toBe("VAT included");
    expect(offeringRowCells(blank).vat).toBe(UNKNOWN_CELL);
  });

  it("groups exact, adjacent, substitute and unclassified in order", () => {
    const offerings = [
      offering({ id: "sub", matchType: "SUBSTITUTE" }),
      offering({ id: "exact", matchType: "EXACT_MATCH" }),
      offering({ id: "adj", matchType: "ADJACENT" }),
    ];
    const groups = buildOfferingTableGroups(
      offerings,
      new Map<string, ClaimRead>(),
      new Map(),
    );
    expect(groups.map((group) => group.matchType)).toEqual([
      "EXACT_MATCH",
      "ADJACENT",
      "SUBSTITUTE",
    ]);
    expect(groups[0]!.rows[0]!.offering.id).toBe("exact");
  });

  it("resolves the linked claim review and its evidence", () => {
    const claim: ClaimRead = {
      id: "c1",
      researchRunId: "run-1",
      type: "FACT",
      statement: "A finding.",
      confidence: "HIGH",
      lifecycleStatus: "CURRENT",
      correctionReason: null,
      correctedAt: null,
      replacedByClaimId: null,
      createdAt: "2026-09-15T10:00:00.000Z",
      updatedAt: "2026-09-15T10:00:00.000Z",
      evidence: [{ id: "link-1", evidenceId: "ev-1", stance: "SUPPORTS" }],
    };
    const evidenceById = new Map([[claim.evidence[0]!.evidenceId, offering({}).evidence]]);
    const [group] = buildOfferingTableGroups(
      [offering({ id: "a", claimId: "c1" })],
      new Map([[claim.id, claim]]),
      evidenceById,
    );
    expect(group!.rows[0]!.review.state).toBe("CURRENT");
    expect(group!.rows[0]!.linkedClaimEvidence.map((item) => item.id)).toEqual([
      "ev-1",
    ]);
  });

  it("expands exactly one row and collapses it", () => {
    // Activation opens the row.
    expect(toggleExpandedRow(null, "a")).toBe("a");
    // Activating another row opens that one and closes the previous (single-open).
    expect(toggleExpandedRow("a", "b")).toBe("b");
    // Activating the open row collapses it.
    expect(toggleExpandedRow("b", "b")).toBeNull();
  });
});
