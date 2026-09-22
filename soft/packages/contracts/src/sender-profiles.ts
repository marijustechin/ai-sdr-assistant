import { z } from 'zod';

/**
 * Sender-profile contracts.
 *
 * A sender profile is a reusable **identity** (label, names, From/Reply-To,
 * signature) that optionally references a mailbox connection (`emailAccountId`,
 * owned by `email-accounts`). It never carries transport credentials — those
 * live only on the email account.
 */

export const SenderProfileStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

const email = z.email().max(320);

export const CreateSenderProfileSchema = z.strictObject({
  label: z.string().trim().min(1).max(255),
  senderName: z.string().trim().min(1).max(255),
  companyName: z.string().trim().min(1).max(255),
  fromEmail: email,
  replyToEmail: email.optional(),
  signature: z.string().max(4000).optional(),
  status: SenderProfileStatusSchema.optional(),
  emailAccountId: z.uuid().optional(),
});

/** Partial update. `emailAccountId: null` clears the mailbox connection. */
export const UpdateSenderProfileSchema = z.strictObject({
  label: z.string().trim().min(1).max(255).optional(),
  senderName: z.string().trim().min(1).max(255).optional(),
  companyName: z.string().trim().min(1).max(255).optional(),
  fromEmail: email.optional(),
  replyToEmail: email.nullable().optional(),
  signature: z.string().max(4000).nullable().optional(),
  status: SenderProfileStatusSchema.optional(),
  emailAccountId: z.uuid().nullable().optional(),
});

/** Public read shape — identity plus an optional mailbox-connection reference. */
export const SenderProfileResponseSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  senderName: z.string(),
  companyName: z.string(),
  fromEmail: z.string(),
  replyToEmail: z.string().nullable(),
  signature: z.string().nullable(),
  status: SenderProfileStatusSchema,
  emailAccountId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SenderProfileStatus = z.infer<typeof SenderProfileStatusSchema>;
export type CreateSenderProfileInput = z.infer<
  typeof CreateSenderProfileSchema
>;
export type UpdateSenderProfileInput = z.infer<
  typeof UpdateSenderProfileSchema
>;
export type SenderProfileResponse = z.infer<typeof SenderProfileResponseSchema>;
