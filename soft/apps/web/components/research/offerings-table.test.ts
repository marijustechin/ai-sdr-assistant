import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The expanded row renders the outreach-decision control, which reads the router;
// a no-op router keeps the static render test independent of the Next runtime.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: () => {},
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));

import { OfferingsTable } from "./offerings-table";
import {
  buildOfferingTableGroups,
  UNKNOWN_CELL,
} from "@/lib/research/offerings-table";
import type { ClaimRead, OfferingRead } from "@/lib/research/types";

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
      evidenceText: "Recorded observation from the supplier page.",
      verificationStatus: "VERIFIED",
      retrievedAt: "2026-09-15T09:00:00.000Z",
      createdAt: "2026-09-15T09:00:00.000Z",
      updatedAt: "2026-09-15T09:00:00.000Z",
      source: {
        id: "src-1",
        url: "https://example.invalid/source-a",
        title: "Supplier A page",
        publisher: "Example",
        sourceType: "supplier-product-page",
      },
    },
    ...overrides,
  };
}

const complete = offering({ id: "a" });
const unitMissing = offering({
  id: "b",
  companyText: "Sauna Direct",
  productText: "Paneeli",
  priceText: "POA",
  priceUnit: null,
  matchType: "ADJACENT",
});
const blank = offering({
  id: "c",
  companyText: null,
  productText: null,
  companyLocationText: null,
  marketServedText: null,
  applicationText: null,
  treatmentText: null,
  dimensionsText: null,
  priceText: null,
  priceCurrency: null,
  priceUnit: null,
  vatStatus: "UNKNOWN",
  priceBasis: "UNKNOWN",
  sampleKind: "UNKNOWN",
  matchType: "SUBSTITUTE",
});

const all = [complete, unitMissing, blank];

function render(offerings: OfferingRead[], initialExpandedId: string | null = null) {
  const groups = buildOfferingTableGroups(
    offerings,
    new Map<string, ClaimRead>(),
    new Map(),
  );
  return renderToStaticMarkup(
    createElement(OfferingsTable, {
      opportunityId: "opp-1",
      groups,
      initialExpandedId,
    }),
  );
}

const occurrences = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

const rowHtml = (html: string, id: string) => {
  const match = html.match(
    new RegExp(`<tr[^>]*id="offering-${id}"[\\s\\S]*?</tr>`),
  );
  if (!match) throw new Error(`row not found: ${id}`);
  return match[0];
};

describe("offerings table rendering", () => {
  it("renders exactly one row per offering", () => {
    const html = render(all);
    expect(occurrences(html, 'data-testid="offering-row"')).toBe(all.length);
    // The expandable detail is a separate row, not an offering row.
    expect(occurrences(html, 'data-testid="offering-detail"')).toBe(0);
  });

  it("renders unknown fields as — and never invents values", () => {
    const html = render(all);
    const blankRow = rowHtml(html, "c");
    // company, product, price, unit, vat, market, and the always-unrecorded stock
    expect(occurrences(blankRow, UNKNOWN_CELL)).toBe(7);
    expect(blankRow).not.toContain("Coyletimber");
  });

  it("displays price and unit independently", () => {
    const html = render(all);
    expect(rowHtml(html, "a")).toContain("GBP 7.00 per metre excluding VAT");
    expect(rowHtml(html, "a")).toContain("per metre");
    // Price is recorded but the unit is not: only the unit cell is unknown.
    const missingUnit = rowHtml(html, "b");
    expect(missingUnit).toContain("POA");
    // Only the unit cell is unknown for this row (plus the always-unknown stock).
    expect(occurrences(missingUnit, UNKNOWN_CELL)).toBe(2);
  });

  it("keeps the exact/adjacent/substitute badge correct", () => {
    const html = render(all);
    expect(html).toContain("Exact match");
    expect(html).toContain("Adjacent product");
    expect(html).toContain("Substitute");
  });

  it("keeps rows collapsed by default and exposes aria state", () => {
    const html = render(all);
    expect(html).not.toContain('data-testid="offering-detail"');
    expect(occurrences(html, 'aria-expanded="false"')).toBe(all.length);
    expect(html).not.toContain('aria-expanded="true"');
  });

  it("expands exactly one row with its detail beneath it", () => {
    const html = render(all, "a");
    expect(occurrences(html, 'data-testid="offering-detail"')).toBe(1);
    expect(occurrences(html, 'aria-expanded="true"')).toBe(1);
    expect(occurrences(html, 'aria-expanded="false"')).toBe(all.length - 1);
    expect(html).toContain('aria-controls="offering-detail-a"');
    expect(html).toContain('id="offering-detail-a"');
  });

  it("shows provenance, evidence and uncertainty in the expanded detail", () => {
    const html = render(all, "a");
    const detail = html.slice(html.indexOf('data-testid="offering-detail"'));
    expect(detail).toContain("Recorded observation from the supplier page.");
    expect(detail).toContain("https://example.invalid/source-a");
    expect(detail).toContain("Dimensions not recorded");
    expect(detail).toContain("Uncertainty (not recorded)");
  });

  it("collapses the row again when nothing is expanded", () => {
    const collapsed = render(all, null);
    const expanded = render(all, "a");
    expect(collapsed).not.toContain('data-testid="offering-detail"');
    expect(expanded).toContain('data-testid="offering-detail"');
  });
});
