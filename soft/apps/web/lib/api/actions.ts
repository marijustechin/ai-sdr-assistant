"use server";

import { revalidatePath } from "next/cache";
import {
  CreateProductSchema,
  CreateResearchRequestSchema,
  UpdateProductSchema,
} from "@ai-sdr/contracts";
import { createProduct, updateProduct } from "./products";
import { submitResearchRequest } from "./research-requests";
import { describeApiError } from "@shared/api/errors";
import type { ProductActionResult } from "@/lib/products/types";
import type { ResearchRequestActionResult } from "@/lib/research-requests/types";

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

const INVALID_MESSAGE =
  "The product could not be saved: please correct the highlighted fields.";

/**
 * Create a product via `POST /products`.
 *
 * Runs on the server so the `x-internal-api-key` header never reaches the
 * browser. It is reachable over HTTP, so the input is re-validated against the
 * shared contract here — the client is never trusted.
 */
export async function createProductAction(
  values: unknown,
): Promise<ProductActionResult> {
  const parsed = CreateProductSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID_MESSAGE,
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    const product = await createProduct(parsed.data);
    revalidatePath("/products");
    return { ok: true, product };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The product could not be created."),
    };
  }
}

/**
 * Update a product via `PATCH /products/:productId`. The payload is validated
 * against the shared `UpdateProductSchema` (partial semantics, nullable
 * clears); unknown or unsupported fields are rejected.
 */
export async function updateProductAction(
  productId: string,
  values: unknown,
): Promise<ProductActionResult> {
  if (typeof productId !== "string" || productId.length === 0) {
    return { ok: false, message: "A product id is required." };
  }

  const parsed = UpdateProductSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID_MESSAGE,
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    const product = await updateProduct(productId, parsed.data);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { ok: true, product };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The product could not be updated."),
    };
  }
}

/**
 * Submit a product-independent market research request via
 * `POST /research-requests`. Runs on the server (key stays server-side) and
 * re-validates against `CreateResearchRequestSchema`; the payload already
 * includes the product id and an idempotency `requestKey`.
 */
export async function submitResearchRequestAction(
  values: unknown,
): Promise<ResearchRequestActionResult> {
  const parsed = CreateResearchRequestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        "The research request could not be submitted: please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    const request = await submitResearchRequest(parsed.data);
    revalidatePath(`/products/${parsed.data.productId}/research`);
    return { ok: true, request };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The research request could not be submitted.",
      ),
    };
  }
}
