import { describe, it, expect } from "vitest";
import {
  isUsableSenderProfile,
  PRICE_INQUIRY_STATUS_LABEL,
  PRICE_INQUIRY_STATUS_TONE,
} from "./display";

describe("price inquiry display helpers", () => {
  it("labels each lifecycle status without implying a final outcome", () => {
    expect(PRICE_INQUIRY_STATUS_LABEL.READY_FOR_HUMAN_REVIEW).toBe(
      "Ready for human review",
    );
    expect(PRICE_INQUIRY_STATUS_LABEL.SENT).toContain("Sent");
    expect(PRICE_INQUIRY_STATUS_LABEL.QUOTE_EXTRACTED).toBe("Quote extracted");
    expect(PRICE_INQUIRY_STATUS_TONE.READY_FOR_HUMAN_REVIEW).toBe("info");
    expect(PRICE_INQUIRY_STATUS_TONE.QUOTE_EXTRACTED).toBe("success");
  });

  it("offers only active sender profiles linked to an email account", () => {
    expect(
      isUsableSenderProfile({ status: "ACTIVE", emailAccountId: "a1" }),
    ).toBe(true);
    expect(
      isUsableSenderProfile({ status: "DISABLED", emailAccountId: "a1" }),
    ).toBe(false);
    expect(
      isUsableSenderProfile({ status: "ACTIVE", emailAccountId: null }),
    ).toBe(false);
  });
});
