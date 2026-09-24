import { z } from 'zod';

/**
 * Product, Offer, and ProductFact API contracts.
 *
 * Write-side schemas validate request bodies. `ProductResponseSchema` is the
 * public read shape returned by the Product admin endpoints; product timestamps
 * are ISO-8601 strings on the wire (consistent with `research-context.ts`).
 */

export const ProductLifecycleStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
]);

export const OfferStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

export const FactStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'SUPERSEDED']);

export const FactVisibilitySchema = z.enum(['OPERATIONAL', 'RESTRICTED']);

export const CreateProductSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  scientificName: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  lifecycleStatus: ProductLifecycleStatusSchema.optional(),
  outreachSenderProfileId: z.uuid().optional(),
  inquirySenderProfileId: z.uuid().optional(),
});

export const CreateOfferSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  commercialStatus: OfferStatusSchema.optional(),
});

/**
 * Partial Product update. Only the fields the admin UI edits. `name` and
 * `lifecycleStatus` are non-nullable; the nullable text columns may be cleared
 * with `null`. Unknown fields are rejected.
 */
export const UpdateProductSchema = z.strictObject({
  name: z.string().trim().min(1).max(255).optional(),
  scientificName: z.string().trim().min(1).max(255).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).max(120).nullable().optional(),
  lifecycleStatus: ProductLifecycleStatusSchema.optional(),
  outreachSenderProfileId: z.uuid().nullable().optional(),
  inquirySenderProfileId: z.uuid().nullable().optional(),
});

/**
 * Public Product read shape. Intentionally small: identity, the stored text
 * fields, lifecycle, and timestamps. No facts, offers, target markets, research
 * status, or derived values. The two sender assignments are **separate
 * contexts**: outreach (buyer/sales) and inquiry (market-research RFQ).
 */
export const ProductResponseSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string(),
  scientificName: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  lifecycleStatus: ProductLifecycleStatusSchema,
  outreachSenderProfileId: z.string().nullable(),
  inquirySenderProfileId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * A fact belongs to exactly one subject (Product XOR Offer) and carries at
 * least one value. `SUPERSEDED` is rejected as an initial state.
 */
export const CreateProductFactSchema = z
  .strictObject({
    productId: z.string().min(1).optional(),
    offerId: z.string().min(1).optional(),
    key: z.string().trim().min(1).max(255),
    valueText: z.string().min(1).optional(),
    valueNumeric: z.number().finite().optional(),
    unit: z.string().trim().min(1).max(64).optional(),
    status: FactStatusSchema.optional(),
    visibility: FactVisibilitySchema.optional(),
    sourceLabel: z.string().trim().min(1).max(255).optional(),
  })
  .refine(
    (value) =>
      (value.productId !== undefined ? 1 : 0) +
        (value.offerId !== undefined ? 1 : 0) ===
      1,
    { message: 'exactly one of productId or offerId is required' },
  )
  .refine(
    (value) => value.valueText !== undefined || value.valueNumeric !== undefined,
    { message: 'at least one of valueText or valueNumeric is required' },
  )
  .refine((value) => value.status !== 'SUPERSEDED', {
    message: 'SUPERSEDED is not a valid initial fact status',
  })
  .refine(
    (value) =>
      value.status !== 'CONFIRMED' ||
      (value.sourceLabel !== undefined && value.sourceLabel.length > 0),
    { message: 'a CONFIRMED fact requires a sourceLabel' },
  );

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type CreateProductFactInput = z.infer<typeof CreateProductFactSchema>;
export type FactStatus = z.infer<typeof FactStatusSchema>;
export type FactVisibility = z.infer<typeof FactVisibilitySchema>;
