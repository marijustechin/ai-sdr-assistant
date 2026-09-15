import { describe, expect, it } from "vitest";
import { CreateProductSchema } from "@ai-sdr/contracts";
import {
  emptyProductFormValues,
  emptyToUndefined,
  productFormSchema,
} from "./schema";

describe("productFormSchema", () => {
  it("is the shared CreateProductSchema (no local request shape)", () => {
    expect(productFormSchema).toBe(CreateProductSchema);
  });

  it("accepts the minimal valid product", () => {
    expect(productFormSchema.safeParse({ name: "Thermo Abachi" }).success).toBe(
      true,
    );
  });

  it("accepts every supported field", () => {
    const result = productFormSchema.safeParse({
      name: "Thermo Abachi",
      scientificName: "Triplochiton scleroxylon",
      category: "hardwood timber",
      description: "Heat-treated tropical hardwood.",
      lifecycleStatus: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("requires a non-blank product name", () => {
    const result = productFormSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("enforces the contract's name length limit", () => {
    const result = productFormSchema.safeParse({ name: "x".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects the unsupported PAUSED lifecycle", () => {
    const result = productFormSchema.safeParse({
      name: "x",
      lifecycleStatus: "PAUSED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown lifecycle status", () => {
    const result = productFormSchema.safeParse({
      name: "x",
      lifecycleStatus: "RETIRED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict contract)", () => {
    const result = productFormSchema.safeParse({ name: "x", bogus: true });
    expect(result.success).toBe(false);
  });

  it("requires normalization for empty optional text", () => {
    expect(
      productFormSchema.safeParse({ name: "x", category: "" }).success,
    ).toBe(false);
    expect(
      productFormSchema.safeParse({
        name: "x",
        category: emptyToUndefined(""),
      }).success,
    ).toBe(true);
  });
});

describe("emptyToUndefined", () => {
  it("maps an empty string to undefined and keeps other values", () => {
    expect(emptyToUndefined("")).toBeUndefined();
    expect(emptyToUndefined("abc")).toBe("abc");
    expect(emptyToUndefined(undefined)).toBeUndefined();
  });
});

describe("emptyProductFormValues", () => {
  it("is an invalid empty draft until a name is provided", () => {
    expect(productFormSchema.safeParse(emptyProductFormValues).success).toBe(
      false,
    );
    expect(
      productFormSchema.safeParse({
        ...emptyProductFormValues,
        name: "Thermo Abachi",
      }).success,
    ).toBe(true);
  });
});
