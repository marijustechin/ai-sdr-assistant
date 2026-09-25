import { describe, it, expect } from "vitest";
import {
  isExcludingDecision,
  languageLabel,
  OUTREACH_DECISION_LABEL,
  summarizeDrafts,
} from "./display";
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
    htmlBody: "<p>Hello,</p>",
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

  it("labels every outreach decision and treats all but ELIGIBLE as excluding", () => {
    expect(OUTREACH_DECISION_LABEL.DO_NOT_CONTACT).toBe("Do not contact");
    expect(OUTREACH_DECISION_LABEL.EXISTING_RELATIONSHIP).toBe(
      "Existing relationship",
    );
    expect(isExcludingDecision("ELIGIBLE")).toBe(false);
    expect(isExcludingDecision("DO_NOT_CONTACT")).toBe(true);
    expect(isExcludingDecision("EXISTING_RELATIONSHIP")).toBe(true);
    expect(isExcludingDecision("NOT_RELEVANT")).toBe(true);
    expect(isExcludingDecision("ALREADY_CONTACTED")).toBe(true);
  });
});
