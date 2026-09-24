import { describe, expect, it } from "vitest";
import type { ProductResponse } from "@ai-sdr/contracts";
import { productResponseToFormValues } from "./mappers";

const product: ProductResponse = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Thermo Abachi",
  scientificName: "Triplochiton scleroxylon",
  description: "Heat-treated.",
  category: "hardwood timber",
  lifecycleStatus: "ACTIVE",
  outreachSenderProfileId: null,
  inquirySenderProfileId: null,
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T11:00:00.000Z",
};

describe("productResponseToFormValues", () => {
  it("maps a live product into form values", () => {
    expect(productResponseToFormValues(product)).toEqual({
      name: "Thermo Abachi",
      scientificName: "Triplochiton scleroxylon",
      description: "Heat-treated.",
      category: "hardwood timber",
      lifecycleStatus: "ACTIVE",
      outreachSenderProfileId: undefined,
      inquirySenderProfileId: undefined,
    });
  });

  it("maps distinct sender assignments and nullable values to undefined", () => {
    const mapped = productResponseToFormValues({
      ...product,
      outreachSenderProfileId: "outreach-1",
      inquirySenderProfileId: "inquiry-1",
      scientificName: null,
      description: null,
      category: null,
    });
    expect(mapped.outreachSenderProfileId).toBe("outreach-1");
    expect(mapped.inquirySenderProfileId).toBe("inquiry-1");
    expect(mapped.scientificName).toBeUndefined();
    expect(mapped.description).toBeUndefined();
    expect(mapped.category).toBeUndefined();
  });
});
