import { describe, expect, it } from "vitest";
import {
  buildClaimViews,
  claimFilterHref,
  currentClaims,
  filterClaims,
  historicalClaims,
  parseClaimFilters,
  replacementId,
} from "./claims";
import type { ClaimRead, EvidenceRead } from "./types";

function claim(overrides: Partial<ClaimRead>): ClaimRead {
  return {
    id: "c0",
    researchRunId: "run-1",
    type: "FACT",
    statement: "statement",
    confidence: "MEDIUM",
    lifecycleStatus: "CURRENT",
    correctionReason: null,
    correctedAt: null,
    replacedByClaimId: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    evidence: [],
    ...overrides,
  };
}

function evidence(id: string): EvidenceRead {
  return {
    id,
    sourceReferenceId: `src-${id}`,
    researchRunId: "run-1",
    evidenceText: `observation ${id}`,
    verificationStatus: "VERIFIED",
    retrievedAt: "2026-09-15T09:00:00.000Z",
    createdAt: "2026-09-15T09:00:00.000Z",
    updatedAt: "2026-09-15T09:00:00.000Z",
    source: {
      id: `src-${id}`,
      url: `https://example.invalid/${id}`,
      title: `Source ${id}`,
      publisher: "Example",
      sourceType: "supplier-product-page",
    },
  };
}

const statementWithPrice =
  "PK-Puu price is 9.99 EUR per linear metre (JM), VAT not stated; sample kept separate.";

const claims: ClaimRead[] = [
  claim({
    id: "c1",
    type: "FACT",
    confidence: "HIGH",
    statement: statementWithPrice,
    evidence: [{ id: "l1", evidenceId: "e1", stance: "SUPPORTS" }],
  }),
  claim({
    id: "c2",
    type: "INFERENCE",
    confidence: "MEDIUM",
    lifecycleStatus: "REPLACED",
    replacedByClaimId: "c3",
    correctionReason: "Unit corrected to per linear metre.",
    correctedAt: "2026-09-15T12:00:00.000Z",
    evidence: [{ id: "l2", evidenceId: "e2", stance: "CONTEXT" }],
  }),
  claim({
    id: "c3",
    type: "INFERENCE",
    confidence: "MEDIUM",
    statement: "Corrected unit statement.",
    evidence: [{ id: "l3", evidenceId: "e1", stance: "SUPPORTS" }],
  }),
  claim({
    id: "c4",
    type: "UNKNOWN",
    confidence: "LOW",
    lifecycleStatus: "RETRACTED",
    correctionReason: "Replaced by a search-bounded finding.",
    correctedAt: "2026-09-15T12:05:00.000Z",
    evidence: [],
  }),
];

describe("claim lifecycle and view models", () => {
  it("treats only CURRENT claims as findings and keeps history separate", () => {
    expect(currentClaims(claims).map((item) => item.id)).toEqual(["c1", "c3"]);
    expect(historicalClaims(claims).map((item) => item.id)).toEqual(["c2", "c4"]);
  });

  it("resolves linked evidence and keeps missing evidence as unavailable", () => {
    const withMissing = [
      claim({
        id: "c5",
        evidence: [{ id: "l5", evidenceId: "missing", stance: "REFUTES" }],
      }),
    ];
    const views = buildClaimViews([...claims, ...withMissing], [evidence("e1")]);
    const c1 = views.find((view) => view.claim.id === "c1");
    const c5 = views.find((view) => view.claim.id === "c5");

    expect(c1?.evidence[0]?.evidence?.evidenceText).toBe("observation e1");
    expect(c1?.evidence[0]?.evidence?.source.url).toBe(
      "https://example.invalid/e1",
    );
    expect(c5?.evidence[0]?.evidence).toBeNull();
    expect(c5?.evidence[0]?.link.evidenceId).toBe("missing");
  });

  it("preserves the recorded statement verbatim (no price parsing)", () => {
    const views = buildClaimViews([claims[0]!], []);
    expect(views[0]?.claim.statement).toBe(statementWithPrice);
  });

  it("filters only on fields the API returns", () => {
    expect(filterClaims(claims, { type: "FACT" }).map((c) => c.id)).toEqual([
      "c1",
    ]);
    expect(
      filterClaims(claims, { confidence: "HIGH" }).map((c) => c.id),
    ).toEqual(["c1"]);
    expect(filterClaims(claims, { stance: "CONTEXT" }).map((c) => c.id)).toEqual(
      ["c2"],
    );
    expect(
      filterClaims(claims, { stance: "REFUTES" }).map((c) => c.id),
    ).toEqual([]);
  });

  it("parses filters and ignores values outside the API enums", () => {
    expect(parseClaimFilters({ type: "FACT", confidence: "HIGH", history: "1" })).toEqual(
      { type: "FACT", confidence: "HIGH", history: true },
    );
    expect(parseClaimFilters({ type: "PRICE", history: "nope" })).toEqual({});
  });

  it("builds filter hrefs for the run path and preserves offering filters", () => {
    expect(claimFilterHref("/r", {})).toBe("/r");
    expect(claimFilterHref("/r", { type: "FACT", history: true })).toBe(
      "/r?type=FACT&history=1",
    );
    expect(
      claimFilterHref(
        "/r",
        { confidence: "HIGH" },
        { market: "GB", matchType: "EXACT_MATCH" },
      ),
    ).toBe("/r?market=GB&matchType=EXACT_MATCH&confidence=HIGH");
  });

  it("navigates to a replacement only for REPLACED claims", () => {
    expect(replacementId(claims[1]!)).toBe("c3");
    expect(replacementId(claims[0]!)).toBeNull();
    expect(replacementId(claims[3]!)).toBeNull();
  });
});
