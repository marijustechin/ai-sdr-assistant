import { describe, expect, it } from "vitest";
import { isNavItemActive } from "./nav";

describe("isNavItemActive", () => {
  it("matches the dashboard only on the root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/products")).toBe(false);
  });

  it("keeps Products active on nested product routes", () => {
    expect(isNavItemActive("/products", "/products")).toBe(true);
    expect(isNavItemActive("/products", "/products/new")).toBe(true);
    expect(isNavItemActive("/products", "/products/abc-123")).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(isNavItemActive("/products", "/")).toBe(false);
    expect(isNavItemActive("/products", "/opportunities")).toBe(false);
  });
});
