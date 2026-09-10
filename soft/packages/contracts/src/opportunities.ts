import { z } from 'zod';

/**
 * TargetMarket and Opportunity API contracts (write side).
 */

export const TargetMarketStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

export const OpportunityStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'CLOSED',
  'ARCHIVED',
]);

export const CreateTargetMarketSchema = z.strictObject({
  country: z.string().trim().min(1).max(120),
  segment: z.string().trim().min(1).max(255),
  lifecycleStatus: TargetMarketStatusSchema.optional(),
});

export const CreateOpportunitySchema = z.strictObject({
  offerId: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  objective: z.string().trim().min(1).optional(),
  lifecycleStatus: OpportunityStatusSchema.optional(),
});

export const AttachTargetMarketSchema = z.strictObject({
  targetMarketId: z.string().min(1),
});

export type CreateTargetMarketInput = z.infer<
  typeof CreateTargetMarketSchema
>;
export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;
export type AttachTargetMarketInput = z.infer<
  typeof AttachTargetMarketSchema
>;
