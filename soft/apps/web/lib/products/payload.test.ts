import { describe, expect, it } from "vitest";
import { UpdateProductSchema } from "@ai-sdr/contracts";
import {
  buildCreateProductPayload,
  buildUpdateProductPayload,
  nullIfBlank,
} from "./payload";

describe("nullIfBlank", () => {
  it("maps blank and missing values to null", () => {
    expect(nullIfBlank("")).toBeNull();
    expect(nullIfBlank("   ")).toBeNull();
    expect(nullIfBlank(undefined)).toBeNull();
    expect(nullIfBlank(null)).toBeNull();
  });

  it("trims and keeps real values", () => {
    expect(nullIfBlank("  Abachi  ")).toBe("Abachi");
  });
});

describe("buildCreateProductPayload", () => {
  it("omits blank optional fields", () => {
    expect(
      buildCreateProductPayload({ name: "Abachi", lifecycleStatus: "DRAFT" }),
    ).toEqual({ name: "Abachi", lifecycleStatus: "DRAFT" });
  });

  it("keeps provided optional fields", () => {
    expect(
      buildCreateProductPayload({
        name: "Abachi",
        scientificName: "Triplochiton scleroxylon",
        description: "Heat-treated.",
        category: "hardwood timber",
        lifecycleStatus: "ACTIVE",
      }),
    ).toEqual({
      name: "Abachi",
      scientificName: "Triplochiton scleroxylon",
      description: "Heat-treated.",
      category: "hardwood timber",
      lifecycleStatus: "ACTIVE",
    });
  });
});

describe("buildUpdateProductPayload", () => {
  it("clears blank nullable fields and keeps provided values", () => {
    expect(
      buildUpdateProductPayload({
        name: "Thermo Abachi",
        scientificName: "",
        description: "Updated summary",
        category: undefined,
        lifecycleStatus: "ARCHIVED",
      }),
    ).toEqual({
      name: "Thermo Abachi",
      scientificName: null,
      description: "Updated summary",
      category: null,
      lifecycleStatus: "ARCHIVED",
    });
  });

  it("produces a payload accepted by the shared UpdateProductSchema", () => {
    const payload = buildUpdateProductPayload({
      name: "Abachi",
      scientificName: undefined,
      description: undefined,
      category: undefined,
      lifecycleStatus: "ACTIVE",
    });
    expect(UpdateProductSchema.safeParse(payload).success).toBe(true);
  });
});
