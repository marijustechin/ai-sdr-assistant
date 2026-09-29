import { describe, it, expect } from "vitest";
import { buildRevisionPayload } from "./payload";

describe("buildRevisionPayload", () => {
  it("sends only the subject and the canonical body", () => {
    const payload = buildRevisionPayload({
      subject: "Edited subject",
      canonicalBody: "Edited message body.",
    });
    expect(Object.keys(payload).sort()).toEqual(["canonicalBody", "subject"]);
    expect(payload.subject).toBe("Edited subject");
    expect(payload.canonicalBody).toBe("Edited message body.");
    // Derived fields are never edited or uploaded independently.
    expect(payload).not.toHaveProperty("body");
    expect(payload).not.toHaveProperty("htmlBody");
  });

  it("trims values and omits blanks (so a revision is only sent when it changes something)", () => {
    expect(
      buildRevisionPayload({ subject: "  ", canonicalBody: "  Body only  " }),
    ).toEqual({ canonicalBody: "Body only" });
    expect(
      buildRevisionPayload({ subject: "Subject only", canonicalBody: "" }),
    ).toEqual({ subject: "Subject only" });
    expect(buildRevisionPayload({ subject: "", canonicalBody: "" })).toEqual({});
  });
});
