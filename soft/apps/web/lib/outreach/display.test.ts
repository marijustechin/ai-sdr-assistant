import { describe, it, expect } from "vitest";
import { languageLabel, summarizeDrafts } from "./display";
import type { OutreachDraftRead } from "./types";

function draft(overrides: Partial<OutreachDraftRead> = {}): OutreachDraftRead {
  return {
    id: "draft-1",
    opportunityId: "opp-1",
    leadId: "lead-1",
    companyId: "company-1",
    contactId: "contact-1",
    recipientEmail: "info@example.invalid",
    language: "en",
    preparationStatus: "PREPARED",
    subject: "A quick question",
    body: "Hello,",
    rationale: "Prepared from context.",
    recipientRationale: "General company email.",
    missingFields: [],
    contextVersion: 4,
    evidenceId: "ev-1",
    claimId: "claim-1",
    sourceReferenceId: "src-1",
    senderProfileId: null,
    emailAccountId: null,
    senderSnapshot: null,
    version: 1,
    createdAt: "2026-09-18T12:00:00.000Z",
    inputsStale: false,
    staleReasons: [],
    ...overrides,
  };
}

describe("outreach draft display helpers", () => {
  it("labels languages generically", () => {
    expect(languageLabel("lt")).toBe("Lithuanian");
    expect(languageLabel("lv")).toBe("Latvian");
    expect(languageLabel("et")).toBe("Estonian");
    expect(languageLabel("en")).toBe("English");
    expect(languageLabel("xx")).toBe("xx");
  });

  it("summarizes prepared/blocked/stale drafts", () => {
    expect(
      summarizeDrafts([
        draft({ id: "a" }),
        draft({ id: "b", preparationStatus: "BLOCKED" }),
        draft({ id: "c", preparationStatus: "BLOCKED", inputsStale: true }),
      ]),
    ).toEqual({ total: 3, prepared: 1, blocked: 2, stale: 1 });
  });
});
