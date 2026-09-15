import { describe, expect, it } from "vitest";
import { formatDateTime } from "./format";

describe("formatDateTime", () => {
  it("formats an ISO timestamp in UTC", () => {
    const formatted = formatDateTime("2026-09-15T10:00:00.000Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("10:00");
  });

  it("returns an em dash for null or invalid input", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
  });
});
