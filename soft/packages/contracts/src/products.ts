import { z } from 'zod';

/**
 * Product, Offer, and ProductFact API contracts (write side).
 *
 * These schemas validate request bodies only. Response shapes for the research
 * context live in `research-context.ts` and implement the canonical
 * `docs/system/research-context-contract.md`.
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
});

export const CreateOfferSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  commercialStatus: OfferStatusSchema.optional(),
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
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type CreateProductFactInput = z.infer<typeof CreateProductFactSchema>;
export type FactStatus = z.infer<typeof FactStatusSchema>;
export type FactVisibility = z.infer<typeof FactVisibilitySchema>;
