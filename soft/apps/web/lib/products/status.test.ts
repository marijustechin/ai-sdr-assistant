import { describe, expect, it } from "vitest";
import { ProductLifecycleStatusSchema } from "@ai-sdr/contracts";
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUSES } from "./status";

describe("product lifecycle status", () => {
  it("is derived from the shared contract enum", () => {
    expect([...PRODUCT_STATUSES]).toEqual([
      ...ProductLifecycleStatusSchema.options,
    ]);
  });

  it("does not model an unsupported PAUSED lifecycle", () => {
    expect(PRODUCT_STATUSES).not.toContain("PAUSED");
  });

  it("labels every status for display", () => {
    for (const status of PRODUCT_STATUSES) {
      expect(PRODUCT_STATUS_LABEL[status]).toBeTruthy();
    }
  });
});
