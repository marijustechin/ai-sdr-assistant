import { describe, it, expect } from "vitest";
import {
  isUsableSenderProfile,
  PRICE_INQUIRY_STATUS_LABEL,
  PRICE_INQUIRY_STATUS_TONE,
} from "./display";

describe("price inquiry display helpers", () => {
  it("labels the only existing status without implying a send state", () => {
    expect(PRICE_INQUIRY_STATUS_LABEL.READY_FOR_HUMAN_REVIEW).toBe(
      "Ready for human review",
    );
    expect(PRICE_INQUIRY_STATUS_TONE.READY_FOR_HUMAN_REVIEW).toBe("info");
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
