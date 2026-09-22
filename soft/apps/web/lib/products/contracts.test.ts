import { describe, expect, it } from "vitest";
import {
  CreateProductSchema,
  ProductResponseSchema,
  UpdateProductSchema,
} from "@ai-sdr/contracts";

const DEFERRED_FIELDS = ["researchStatus", "targetMarket", "specifications"];

const schemas = {
  create: CreateProductSchema,
  update: UpdateProductSchema,
  response: ProductResponseSchema,
};

describe("product contracts expose only supported fields", () => {
  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name} has no deferred fields`, () => {
      const keys = Object.keys(schema.shape);
      for (const field of DEFERRED_FIELDS) {
        expect(keys, `${name}.${field}`).not.toContain(field);
      }
    });
  }

  it("rejects the unsupported PAUSED lifecycle in an update", () => {
    expect(
      UpdateProductSchema.safeParse({ lifecycleStatus: "PAUSED" }).success,
    ).toBe(false);
  });

  it("accepts a full ProductResponse", () => {
    expect(
      ProductResponseSchema.safeParse({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Abachi",
        scientificName: null,
        description: null,
        category: null,
        lifecycleStatus: "DRAFT",
        senderProfileId: null,
        createdAt: "2026-09-15T10:00:00.000Z",
        updatedAt: "2026-09-15T11:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});
