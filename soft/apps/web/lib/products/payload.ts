import type { CreateProductInput, UpdateProductInput } from "@ai-sdr/contracts";
import type { ProductFormValues } from "./schema";

/**
 * Trim a form value; a blank or missing value clears the field. Used for the
 * nullable columns (`scientificName`, `description`, `category`) so an edit
 * form leaves no ambiguity between "keep" and "clear": on the edit form an
 * empty field means the value should be removed.
 */
export function nullIfBlank(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Build the `POST /products` body; blank optional fields are omitted. */
export function buildCreateProductPayload(
  values: ProductFormValues,
): CreateProductInput {
  const payload: CreateProductInput = { name: values.name };
  if (values.scientificName) payload.scientificName = values.scientificName;
  if (values.description) payload.description = values.description;
  if (values.category) payload.category = values.category;
  if (values.lifecycleStatus) payload.lifecycleStatus = values.lifecycleStatus;
  if (values.senderProfileId) payload.senderProfileId = values.senderProfileId;
  return payload;
}

/**
 * Build the `PATCH /products/:id` body from the full edit form. The edit form
 * always submits every editable field, so blank nullable fields are sent as
 * `null` to clear them.
 */
export function buildUpdateProductPayload(
  values: ProductFormValues,
): UpdateProductInput {
  return {
    name: values.name,
    scientificName: nullIfBlank(values.scientificName),
    description: nullIfBlank(values.description),
    category: nullIfBlank(values.category),
    ...(values.lifecycleStatus
      ? { lifecycleStatus: values.lifecycleStatus }
      : {}),
    senderProfileId: values.senderProfileId ? values.senderProfileId : null,
  };
}
