import type { ProductResponse } from "@ai-sdr/contracts";

/**
 * Result returned to the client from a Product Server Action. Success carries
 * the shared `ProductResponse` so the UI refreshes from the API's own shape.
 */
export type ProductActionResult =
  | { ok: true; product: ProductResponse }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
