import { describe, expect, it } from "vitest";
import { buildTestPreviewRequest, parseTestRecipients } from "./test-preview";

describe("send-test preview form parsing", () => {
  it("parses, lower-cases and dedupes recipients from mixed input", () => {
    expect(
      parseTestRecipients([
        " M.Smiginas@Gmail.com, info@alfasis.eu",
        "info@alfasis.eu;other@example.com",
      ]),
    ).toEqual([
      "m.smiginas@gmail.com",
      "info@alfasis.eu",
      "other@example.com",
    ]);
  });

  it("requires the explicit acknowledgement checkbox", () => {
    const form = new FormData();
    form.set("scope", "ALL");
    form.append("testRecipients", "m.smiginas@gmail.com");
    expect(buildTestPreviewRequest(form)).toBeNull();

    form.set("confirm", "on");
    expect(buildTestPreviewRequest(form)).not.toBeNull();
  });

  it("requires at least one test recipient", () => {
    const form = new FormData();
    form.set("confirm", "on");
    form.set("scope", "ALL");
    expect(buildTestPreviewRequest(form)).toBeNull();
  });

  it("builds an ALL request without draft ids", () => {
    const form = new FormData();
    form.set("confirm", "on");
    form.set("scope", "ALL");
    form.append("testRecipients", "info@alfasis.eu");
    expect(buildTestPreviewRequest(form)).toEqual({
      scope: "ALL",
      draftIds: undefined,
      testRecipients: ["info@alfasis.eu"],
      subjectPrefix: undefined,
    });
  });

  it("requires a draft id for SELECTED and passes an optional prefix", () => {
    const missing = new FormData();
    missing.set("confirm", "on");
    missing.set("scope", "SELECTED");
    missing.append("testRecipients", "info@alfasis.eu");
    expect(buildTestPreviewRequest(missing)).toBeNull();

    const complete = new FormData();
    complete.set("confirm", "on");
    complete.set("scope", "SELECTED");
    complete.set("draftId", "22222222-2222-4222-8222-222222222222");
    complete.append("testRecipients", "info@alfasis.eu");
    complete.set("subjectPrefix", "[TEST]");
    expect(buildTestPreviewRequest(complete)).toEqual({
      scope: "SELECTED",
      draftIds: ["22222222-2222-4222-8222-222222222222"],
      testRecipients: ["info@alfasis.eu"],
      subjectPrefix: "[TEST]",
    });
  });
});
