import { describe, expect, it } from "vitest";
import {
  filterOfferings,
  groupOfferingsByMatch,
  linkedCurrentClaim,
  offeringClaimState,
  offeringDisplayName,
  offeringFilterHref,
  offeringFilterOptions,
  offeringUncertainty,
  parseOfferingFilters,
  unlinkedCurrentClaims,
} from "./offerings";
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
    treatmentText: "thermal modification 190-215 C",
    dimensionsText: null,
    priceText: "GBP 7.00 per metre excluding VAT (inc VAT GBP 8.40)",
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

const offerings: OfferingRead[] = [
  offering({ id: "gb-exact", matchType: "EXACT_MATCH", claimId: "c-current" }),
  offering({
    id: "lt-sauna",
    companyText: "Pirtele.lt",
    marketServedText: "LT",
    applicationText: "sauna/bathhouse cladding",
    matchType: "EXACT_MATCH",
  }),
  offering({
    id: "adj",
    companyText: "Sauna Direct",
    matchType: "ADJACENT",
    applicationText: "sauna/bathhouse cladding",
  }),
  offering({
    id: "sub",
    companyText: "Siparila",
    matchType: "SUBSTITUTE",
    applicationText: "exterior/facade cladding",
  }),
  offering({
    id: "unknown",
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
    matchType: "UNKNOWN",
  }),
];

const claims: ClaimRead[] = [
  {
    id: "c-current",
    researchRunId: "run-1",
    type: "FACT",
    statement: "GB seller supplies thermo-Ayous cladding.",
    confidence: "HIGH",
    lifecycleStatus: "CURRENT",
    correctionReason: null,
    correctedAt: null,
    replacedByClaimId: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    evidence: [],
  },
  {
    id: "c-historical",
    researchRunId: "run-1",
    type: "INFERENCE",
    statement: "Old unit.",
    confidence: "MEDIUM",
    lifecycleStatus: "REPLACED",
    correctionReason: "unit",
    correctedAt: "2026-09-15T12:00:00.000Z",
    replacedByClaimId: "c-current",
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    evidence: [],
  },
  {
    id: "c-unlinked",
    researchRunId: "run-1",
    type: "UNKNOWN",
    statement: "Market-level uncertainty.",
    confidence: "LOW",
    lifecycleStatus: "CURRENT",
    correctionReason: null,
    correctedAt: null,
    replacedByClaimId: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    evidence: [],
  },
  {
    id: "c-retracted",
    researchRunId: "run-1",
    type: "UNKNOWN",
    statement: "Withdrawn absence claim.",
    confidence: "LOW",
    lifecycleStatus: "RETRACTED",
    correctionReason: "Replaced by a search-bounded finding.",
    correctedAt: "2026-09-15T12:10:00.000Z",
    replacedByClaimId: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T12:10:00.000Z",
    evidence: [],
  },
];

describe("offerings view model", () => {
  it("builds display names without inventing a company", () => {
    expect(offeringDisplayName(offerings[0]!)).toBe(
      "Coyletimber Ltd — Thermo Ayous Cladding",
    );
    expect(offeringDisplayName(offerings[4]!)).toBe("Unnamed offering");
  });

  it("derives filter options only from recorded values", () => {
    const options = offeringFilterOptions(offerings);
    expect(options.markets).toEqual(["GB", "LT"]);
    expect(options.applications).toEqual([
      "exterior/facade cladding",
      "sauna/bathhouse cladding",
    ]);
    expect(options.matchTypes).toEqual([
      "EXACT_MATCH",
      "ADJACENT",
      "SUBSTITUTE",
      "UNKNOWN",
    ]);
  });

  it("filters by market, application and match type, and parses/hrefs safely", () => {
    expect(filterOfferings(offerings, { market: "LT" }).map((o) => o.id)).toEqual(
      ["lt-sauna"],
    );
    expect(
      filterOfferings(offerings, { application: "sauna/bathhouse cladding" }).map(
        (o) => o.id,
      ),
    ).toEqual(["lt-sauna", "adj"]);
    expect(filterOfferings(offerings, { matchType: "SUBSTITUTE" }).map((o) => o.id)).toEqual(
      ["sub"],
    );
    expect(parseOfferingFilters({ matchType: "NEAR" })).toEqual({});
    expect(offeringFilterHref("/r", {})).toBe("/r");
    expect(offeringFilterHref("/r", { market: "GB", matchType: "EXACT_MATCH" })).toBe(
      "/r?market=GB&matchType=EXACT_MATCH",
    );
    expect(
      offeringFilterHref("/r", { market: "GB" }, { type: "FACT", history: true }),
    ).toBe("/r?market=GB&type=FACT&history=1");
  });

  it("groups offerings by match class, exact first", () => {
    const groups = groupOfferingsByMatch(offerings);
    expect(groups.map((group) => group.matchType)).toEqual([
      "EXACT_MATCH",
      "ADJACENT",
      "SUBSTITUTE",
      "UNKNOWN",
    ]);
  });

  it("lists uncertainty from unrecorded fields and never invents values", () => {
    const partial = offeringUncertainty(offerings[0]!);
    expect(partial).toContain("Dimensions not recorded");
    expect(partial).not.toContain("Price not recorded");

    const empty = offeringUncertainty(offerings[4]!);
    expect(empty).toContain("Price not recorded");
    expect(empty).toContain("VAT treatment unknown");
    expect(empty).toContain("Application not recorded");
    expect(empty).toContain("Exact/adjacent/substitute not recorded");
  });

  it("preserves original price wording verbatim", () => {
    expect(offerings[0]!.priceText).toBe(
      "GBP 7.00 per metre excluding VAT (inc VAT GBP 8.40)",
    );
  });

  it("links only CURRENT claims and keeps unlinked findings", () => {
    const byId = new Map(claims.map((claim) => [claim.id, claim]));
    expect(linkedCurrentClaim(offerings[0]!, byId)?.id).toBe("c-current");
    expect(
      linkedCurrentClaim(offering({ id: "h", claimId: "c-historical" }), byId),
    ).toBeNull();
    expect(unlinkedCurrentClaims(claims, offerings).map((c) => c.id)).toEqual([
      "c-unlinked",
    ]);
  });

  it("flags an offering whose linked finding was replaced or retracted", () => {
    const byId = new Map(claims.map((claim) => [claim.id, claim]));
    expect(offeringClaimState(offerings[0]!, byId).state).toBe("CURRENT");
    expect(
      offeringClaimState(offering({ id: "h", claimId: "c-historical" }), byId)
        .state,
    ).toBe("REPLACED");
    expect(
      offeringClaimState(offering({ id: "r", claimId: "c-retracted" }), byId)
        .state,
    ).toBe("RETRACTED");
    expect(
      offeringClaimState(offering({ id: "m", claimId: "missing" }), byId).state,
    ).toBe("MISSING");
    expect(
      offeringClaimState(offering({ id: "n", claimId: null }), byId).state,
    ).toBe("NONE");
  });
});
