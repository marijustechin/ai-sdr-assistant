import { describe, expect, it } from "vitest";
import {
  BRIEF_FINDING_KIND_LABEL,
  BRIEF_SECTION_LABEL,
  type BriefFindingKind,
} from "./index";

describe("company brief display labels", () => {
  it("labels every finding kind distinctly (facts vs hypotheses)", () => {
    const kinds: BriefFindingKind[] = [
      "KNOWN_FACT",
      "RECENT_ENRICHMENT",
      "COMMERCIAL_HYPOTHESIS",
    ];
    for (const kind of kinds) {
      expect(BRIEF_FINDING_KIND_LABEL[kind]).toBeTruthy();
    }
    expect(BRIEF_FINDING_KIND_LABEL.COMMERCIAL_HYPOTHESIS).toContain(
      "hypothesis",
    );
  });

  it("covers all brief sections including unknowns and questions", () => {
    expect(BRIEF_SECTION_LABEL.unknownsGaps).toBeTruthy();
    expect(BRIEF_SECTION_LABEL.questionsWorthAsking).toBeTruthy();
    expect(BRIEF_SECTION_LABEL.commercialHypotheses).toBeTruthy();
  });
});
