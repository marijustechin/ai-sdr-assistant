import { describe, it, expect } from "vitest";
import {
  buildResearchRequestInput,
  describeCostPolicy,
  initialFormValues,
  parseList,
  type ResearchRequestFormValues,
} from "./schema";

describe("research request form helpers", () => {
  it("parses comma/newline lists, trimming and de-duplicating", () => {
    expect(parseList("Lithuania, Latvia\n lithuania ,Germany")).toEqual([
      "Lithuania",
      "Latvia",
      "Germany",
    ]);
    expect(parseList("   ")).toEqual([]);
  });

  it("builds a SPECIFIED request with editable segments", () => {
    const values: ResearchRequestFormValues = {
      ...initialFormValues(),
      countries: "Lithuania, Latvia",
      goals: ["SUPPLIERS_MANUFACTURERS", "PRICES"],
      segmentPolicy: "SPECIFIED",
      segments: "suppliers, distributors",
      questions: "Who ships to the Baltics?",
      constraints: "Public sources only",
    };

    const input = buildResearchRequestInput(values, {
      productId: "11111111-1111-4111-8111-111111111111",
      requestKey: "key-12345678",
    });

    expect(input.parameters.countries).toEqual(["Lithuania", "Latvia"]);
    expect(input.parameters.segments).toEqual(["suppliers", "distributors"]);
    expect(input.parameters.questions).toEqual([
      "Who ships to the Baltics?",
    ]);
    expect(input.parameters.constraints).toEqual(["Public sources only"]);
    expect(input.parameters.limits.costPolicy).toBe("FREE_ONLY");
    expect(input.requestKey).toBe("key-12345678");
  });

  it("omits segments when identifying during research", () => {
    const values: ResearchRequestFormValues = {
      ...initialFormValues(),
      countries: "Ghana",
      goals: ["POTENTIAL_BUYERS"],
      segmentPolicy: "IDENTIFY_DURING_RESEARCH",
      segments: "should be ignored",
    };

    const input = buildResearchRequestInput(values, {
      productId: "11111111-1111-4111-8111-111111111111",
      requestKey: "key-12345678",
    });

    expect(input.parameters.segments).toBeUndefined();
  });

  it("defaults to FREE_ONLY and omits metered provider grants", () => {
    const input = buildResearchRequestInput(initialFormValues(), {
      productId: "11111111-1111-4111-8111-111111111111",
      requestKey: "key-12345678",
    });
    expect(input.parameters.limits.costPolicy).toBe("FREE_ONLY");
    expect(input.parameters.limits.meteredProviders).toBeUndefined();
    expect(describeCostPolicy(initialFormValues())).toContain("Free-tier tools only");
    expect(describeCostPolicy(initialFormValues())).toContain("can pause");
  });

  it("serialises METERED_APPROVED with finite provider call limits", () => {
    const values: ResearchRequestFormValues = {
      ...initialFormValues(),
      countries: "Germany",
      goals: ["SUPPLIERS_MANUFACTURERS"],
      costPolicy: "METERED_APPROVED",
      meteredProviders: ["GEMINI", "EXA"],
      meteredMaxCalls: { EXA: "5", FIRECRAWL: "25", GEMINI: "20" },
    };
    const input = buildResearchRequestInput(values, {
      productId: "11111111-1111-4111-8111-111111111111",
      requestKey: "key-12345678",
    });
    expect(input.parameters.limits.costPolicy).toBe("METERED_APPROVED");
    expect(input.parameters.limits.meteredProviders).toEqual([
      { provider: "GEMINI", maxCalls: 20 },
      { provider: "EXA", maxCalls: 5 },
    ]);
    const summary = describeCostPolicy(values);
    expect(summary).toContain("Metered tools permitted");
    expect(summary).toContain("Gemini");
    expect(summary).toContain("20 calls");
    expect(summary).toContain("UNKNOWN");
    expect(summary).toContain("no hard euro spending cap");
  });
});
