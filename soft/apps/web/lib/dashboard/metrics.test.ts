import { describe, it, expect } from "vitest";
import type { DashboardSummary } from "@ai-sdr/contracts";
import { buildDashboardCards } from "./metrics";

const zeros: DashboardSummary = {
  products: { active: 0, draft: 0, archived: 0, total: 0 },
  researchRuns: { total: 0, completed: 0 },
  leads: { total: 0 },
  outreachDrafts: { total: 0, prepared: 0, blocked: 0 },
};

describe("buildDashboardCards", () => {
  it("renders real zero counts (not placeholders)", () => {
    const cards = buildDashboardCards(zeros);
    expect(cards.map((card) => card.value)).toEqual(["0", "0", "0", "0"]);
    expect(cards.map((card) => card.key)).toEqual([
      "active-products",
      "research-runs",
      "leads",
      "outreach-drafts",
    ]);
  });

  it("maps non-zero counts and secondary hints", () => {
    const cards = buildDashboardCards({
      products: { active: 2, draft: 1, archived: 3, total: 6 },
      researchRuns: { total: 5, completed: 4 },
      leads: { total: 3 },
      outreachDrafts: { total: 3, prepared: 1, blocked: 2 },
    });
    const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
    expect(byKey["active-products"]?.value).toBe("2");
    expect(byKey["active-products"]?.hint).toBe("6 products total");
    expect(byKey["research-runs"]?.value).toBe("5");
    expect(byKey["research-runs"]?.hint).toBe("4 completed");
    expect(byKey["leads"]?.value).toBe("3");
    expect(byKey["outreach-drafts"]?.value).toBe("3");
    expect(byKey["outreach-drafts"]?.hint).toBe("1 prepared · 2 blocked");
  });

  it("uses singular wording for a single product", () => {
    const cards = buildDashboardCards({
      ...zeros,
      products: { active: 1, draft: 0, archived: 0, total: 1 },
    });
    expect(cards[0]?.hint).toBe("1 product total");
  });
});
