import { describe, it, expect } from "vitest";
import {
  agentQualificationLabel,
  claimLifecycleLabel,
  leadDetailPath,
  leadEligibleForContactDiscovery,
  leadNeedsAttention,
  leadReviewStatusLabel,
  leadRoleLabel,
  opportunityCountries,
  partitionOpportunities,
  summarizeLeads,
} from "./display";
import type { LeadRead } from "./types";
import type { OpportunityRead } from "@/lib/research/types";

function lead(overrides: Partial<LeadRead> = {}): LeadRead {
  return {
    id: "lead-1",
    opportunityId: "opp-1",
    companyId: "company-1",
    company: {
      id: "company-1",
      name: "Pirties Meistrai",
      normalizedName: "pirties meistrai",
      website: "https://pirtiesmeistrai.lt",
      country: "Lithuania",
    },
    observedActivityText: "Designs and installs saunas.",
    observedRoles: ["INSTALLER", "BUILDER"],
    buyerFitHypothesisText: "May buy thermo-Abachi cladding.",
    unknownsText: null,
    nextVerificationStepText: null,
    reviewStatus: "UNREVIEWED",
    reviewReason: null,
    reviewedAt: null,
    agentQualificationStatus: "NOT_ASSESSED",
    agentQualificationReason: null,
    agentAssessedAt: null,
    agentQualificationStale: false,
    eligibleForContactDiscovery: false,
    sourceReferenceId: "src-1",
    evidenceId: "ev-1",
    claimId: "claim-1",
    dedupKey: "opp-1\u0000pirties meistrai\u0000",
    needsReview: false,
    createdAt: "2026-09-18T07:00:00.000Z",
    updatedAt: "2026-09-18T07:00:00.000Z",
    evidence: {
      id: "ev-1",
      researchRunId: "run-1",
      evidenceText: "The company installs saunas.",
      verificationStatus: "VERIFIED",
      retrievedAt: "2026-09-18T07:00:00.000Z",
      source: {
        id: "src-1",
        url: "https://pirtiesmeistrai.lt/",
        title: null,
        publisher: null,
        sourceType: null,
      },
    },
    claim: {
      id: "claim-1",
      type: "FACT",
      statement: "Builds saunas.",
      confidence: "HIGH",
      lifecycleStatus: "CURRENT",
      correctionReason: null,
      correctedAt: null,
      replacedByClaimId: null,
    },
    ...overrides,
  };
}

describe("lead display helpers", () => {
  it("labels review status and observed roles", () => {
    expect(leadReviewStatusLabel("UNREVIEWED")).toBe("Unreviewed");
    expect(leadReviewStatusLabel("SHORTLISTED")).toBe("Shortlisted");
    expect(leadReviewStatusLabel("REJECTED")).toBe("Rejected");
    expect(leadRoleLabel("INSTALLER")).toBe("Installer");
    expect(leadRoleLabel("MANUFACTURER")).toBe("Manufacturer");
    expect(agentQualificationLabel("QUALIFIED")).toBe("Agent-qualified");
    expect(agentQualificationLabel("NEEDS_MORE_EVIDENCE")).toBe(
      "Needs more evidence",
    );
  });

  it("exposes agent qualification and contact-discovery eligibility separately from review", () => {
    const qualified = lead({
      agentQualificationStatus: "QUALIFIED",
      eligibleForContactDiscovery: true,
      reviewStatus: "UNREVIEWED",
    });
    expect(leadEligibleForContactDiscovery(qualified)).toBe(true);
    const rejected = lead({
      agentQualificationStatus: "QUALIFIED",
      eligibleForContactDiscovery: false,
      reviewStatus: "REJECTED",
    });
    expect(leadEligibleForContactDiscovery(rejected)).toBe(false);
  });

  it("summarizes review states and flags needing review", () => {
    const summary = summarizeLeads([
      lead({ id: "a", reviewStatus: "UNREVIEWED" }),
      lead({ id: "b", reviewStatus: "SHORTLISTED" }),
      lead({ id: "c", reviewStatus: "REJECTED" }),
      lead({ id: "d", reviewStatus: "SHORTLISTED", needsReview: true }),
    ]);
    expect(summary).toEqual({
      total: 4,
      unreviewed: 1,
      shortlisted: 2,
      rejected: 1,
      needingReview: 1,
    });
  });

  it("surfaces a replaced claim as needing attention", () => {
    const replaced = lead({
      needsReview: true,
      claim: {
        id: "claim-1",
        type: "FACT",
        statement: "Builds saunas.",
        confidence: "HIGH",
        lifecycleStatus: "REPLACED",
        correctionReason: "superseded",
        correctedAt: "2026-09-18T08:00:00.000Z",
        replacedByClaimId: "claim-2",
      },
    });
    expect(leadNeedsAttention(replaced)).toBe(true);
    expect(claimLifecycleLabel(replaced.claim!.lifecycleStatus)).toContain(
      "needs review",
    );
  });
});

function opportunity(
  id: string,
  countries: string[],
): OpportunityRead {
  return {
    id,
    offerId: "offer-1",
    name: `Opportunity ${id}`,
    objective: null,
    lifecycleStatus: "ACTIVE",
    contextVersion: 1,
    targetMarkets: countries.map((country, index) => ({
      id: `${id}-market-${index}`,
      country,
      segment: "sauna builders",
      lifecycleStatus: "ACTIVE",
    })),
  };
}

describe("lead list helpers", () => {
  it("reads countries only from recorded target markets and de-duplicates", () => {
    expect(
      opportunityCountries(opportunity("a", ["Lithuania", "Latvia", "Lithuania"])),
    ).toEqual(["Lithuania", "Latvia"]);
    // A country is never inferred from the opportunity title or a candidate.
    expect(opportunityCountries(opportunity("b", []))).toEqual([]);
  });

  it("builds a detail path including the opportunity id", () => {
    expect(leadDetailPath("p1", "o1", "l1")).toBe("/products/p1/leads/o1/l1");
  });

  it("orders opportunities with candidates before those without", () => {
    const withLeads = opportunity("with", ["Lithuania"]);
    const withoutLeads = opportunity("without", ["Latvia"]);
    const secondWithLeads = opportunity("with2", ["Estonia"]);
    const map = new Map<string, LeadRead[]>([
      ["with", [lead({ id: "l1" })]],
      ["with2", [lead({ id: "l2" })]],
      ["without", []],
    ]);
    const { withCandidates, withoutCandidates } = partitionOpportunities(
      [withoutLeads, withLeads, secondWithLeads],
      map,
    );
    expect(withCandidates.map((o) => o.id)).toEqual(["with", "with2"]);
    expect(withoutCandidates.map((o) => o.id)).toEqual(["without"]);
  });
});
