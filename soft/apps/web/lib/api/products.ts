import type {
  CreateProductInput,
  ProductResponse,
  UpdateProductInput,
} from "@ai-sdr/contracts";
import { apiRequest, ApiError } from "./client";

/** GET /products — live. Ordering is the API's (most recently updated first). */
export async function listProducts(): Promise<ProductResponse[]> {
  return apiRequest<ProductResponse[]>("/products", { method: "GET" });
}

/**
 * GET /products/:productId — live. Returns `null` when the API reports 404.
 */
export async function getProduct(
  productId: string,
): Promise<ProductResponse | null> {
  try {
    return await apiRequest<ProductResponse>(
      `/products/${encodeURIComponent(productId)}`,
      { method: "GET" },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** POST /products — live. */
export async function createProduct(
  payload: CreateProductInput,
): Promise<ProductResponse> {
  return apiRequest<ProductResponse>("/products", {
    method: "POST",
    body: payload,
  });
}

/** PATCH /products/:productId — live. */
export async function updateProduct(
  productId: string,
  payload: UpdateProductInput,
): Promise<ProductResponse> {
  return apiRequest<ProductResponse>(
    `/products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: payload },
  );
}
