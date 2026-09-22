import type { ProductResponse } from "@ai-sdr/contracts";
import type { ProductFormValues } from "./schema";

/**
 * Convert a live `ProductResponse` into the values the edit form expects.
 * Nullable API values become `undefined` (the form treats them as "not set").
 */
export function productResponseToFormValues(
  product: ProductResponse,
): ProductFormValues {
  return {
    name: product.name,
    scientificName: product.scientificName ?? undefined,
    description: product.description ?? undefined,
    category: product.category ?? undefined,
    lifecycleStatus: product.lifecycleStatus,
    senderProfileId: product.senderProfileId ?? undefined,
  };
}
