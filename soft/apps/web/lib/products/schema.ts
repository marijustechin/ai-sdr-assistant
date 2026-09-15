import { CreateProductSchema, type CreateProductInput } from "@ai-sdr/contracts";

/**
 * The product form validates against the shared `CreateProductSchema`
 * directly — there is no separate local request shape, so the UI cannot drift
 * from the `POST /products` contract in
 * `soft/packages/contracts/src/products.ts`.
 *
 * Specifications are intentionally not part of this first form: the product
 * API does not accept them, they would be written as separate `ProductFact`
 * records, and there is no read path to display them yet. See
 * `docs/MISSING_API.md`.
 */
export const productFormSchema = CreateProductSchema;

export type ProductFormValues = CreateProductInput;

/** Initial values for the create form. `lifecycleStatus` defaults to `DRAFT`. */
export const emptyProductFormValues: ProductFormValues = {
  name: "",
  lifecycleStatus: "DRAFT",
};

/**
 * React Hook Form `setValueAs` helper: an empty text input means "not
 * provided", so clearing an optional field does not trip the contract's
 * `min(1)` rule. Whitespace-only input is left to the contract to reject.
 */
export function emptyToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}
