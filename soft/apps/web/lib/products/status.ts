import { ProductLifecycleStatusSchema } from "@ai-sdr/contracts";

/**
 * Product lifecycle, derived from the shared contract
 * (`ProductLifecycleStatusSchema` in `soft/packages/contracts/src/products.ts`).
 * Derived rather than re-declared so the UI cannot drift from the API enum.
 *
 * The contract is `DRAFT | ACTIVE | ARCHIVED`. There is intentionally no
 * `PAUSED` value: the current domain does not persist one and the web app must
 * not invent it. See `docs/MISSING_API.md`.
 */
export const PRODUCT_STATUSES = ProductLifecycleStatusSchema.options;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export const PRODUCT_STATUS_TONE: Record<ProductStatus, StatusTone> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ARCHIVED: "neutral",
};
