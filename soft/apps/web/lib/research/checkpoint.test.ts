import { describe, expect, it } from "vitest";
import { parseCheckpoint, recordedNotes } from "./checkpoint";

describe("parseCheckpoint", () => {
  it("renders absent or malformed checkpoints as unavailable", () => {
    for (const value of [null, undefined, "text", 42, [], true]) {
      const view = parseCheckpoint(value);
      expect(view.present).toBe(false);
      expect(view.notes).toBeNull();
      expect(view.coverage).toEqual([]);
      expect(view.pendingFollowUps).toEqual([]);
    }
  });

  it("parses coverage, follow-ups and notes without inventing fields", () => {
    const view = parseCheckpoint({
      notes: "Discovery 23/30; retrieval 35/50",
      coverage: [
        {
          targetMarketId: "m1",
          dimension: "suppliers",
          status: "COVERED",
          note: "verified",
        },
      ],
      pendingFollowUps: [{ kind: "AREA", ref: "m2", note: "later" }],
    });

    expect(view.present).toBe(true);
    expect(recordedNotes(view)).toBe("Discovery 23/30; retrieval 35/50");
    expect(view.coverage).toEqual([
      {
        targetMarketId: "m1",
        dimension: "suppliers",
        status: "COVERED",
        note: "verified",
      },
    ]);
    expect(view.pendingFollowUps).toEqual([
      { kind: "AREA", ref: "m2", note: "later" },
    ]);
    expect(view.malformedCoverage).toBe(0);
    expect(view.malformedFollowUps).toBe(0);
  });

  it("drops malformed entries and counts them instead of guessing", () => {
    const view = parseCheckpoint({
      coverage: [
        { targetMarketId: "m1", dimension: "suppliers", status: "GAP" },
        { dimension: "prices", status: "GAP" },
        "not-an-object",
      ],
      pendingFollowUps: [{ kind: "AREA" }, { kind: "SOURCE", ref: "u" }],
    });

    expect(view.coverage).toHaveLength(1);
    expect(view.malformedCoverage).toBe(2);
    expect(view.pendingFollowUps).toHaveLength(1);
    expect(view.malformedFollowUps).toBe(1);
  });

  it("treats non-array coverage/follow-ups as absent, not malformed", () => {
    const view = parseCheckpoint({ coverage: {}, pendingFollowUps: 3 });
    expect(view.coverage).toEqual([]);
    expect(view.pendingFollowUps).toEqual([]);
    expect(view.malformedCoverage).toBe(0);
    expect(view.malformedFollowUps).toBe(0);
  });

  it("preserves recorded notes verbatim", () => {
    const notes = "Monetary cost UNKNOWN; €3.91 incl. VAT is a 300 mm sample";
    expect(parseCheckpoint({ notes }).notes).toBe(notes);
  });
});
