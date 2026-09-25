import { z } from 'zod';

/**
 * Sender-profile contracts.
 *
 * A sender profile is a reusable **identity** (label, sender name, optional
 * role/title, optional company/brand, From/Reply-To) that optionally references
 * a mailbox connection (`emailAccountId`, owned by `email-accounts`). It never
 * carries transport credentials — those live only on the email account. A
 * company/brand and a signature are optional; generation must never invent a
 * company, and must not depend on a stored signature.
 */

export const SenderProfileStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

const email = z.email().max(320);

export const CreateSenderProfileSchema = z.strictObject({
  label: z.string().trim().min(1).max(255),
  senderName: z.string().trim().min(1).max(255),
  senderTitle: z.string().trim().min(1).max(255).optional(),
  companyName: z.string().trim().min(1).max(255).optional(),
  fromEmail: email,
  replyToEmail: email.optional(),
  phone: z.string().trim().min(1).max(64).optional(),
  website: z.url().max(2048).optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappPhone: z.string().trim().min(1).max(64).optional(),
  logoUrl: z.url().max(2048).optional(),
  includeLogoInSignature: z.boolean().optional(),
  signature: z.string().max(4000).optional(),
  status: SenderProfileStatusSchema.optional(),
  emailAccountId: z.uuid().optional(),
});

/** Partial update. `null` clears an optional field. */
export const UpdateSenderProfileSchema = z.strictObject({
  label: z.string().trim().min(1).max(255).optional(),
  senderName: z.string().trim().min(1).max(255).optional(),
  senderTitle: z.string().trim().min(1).max(255).nullable().optional(),
  companyName: z.string().trim().min(1).max(255).nullable().optional(),
  fromEmail: email.optional(),
  replyToEmail: email.nullable().optional(),
  phone: z.string().trim().min(1).max(64).nullable().optional(),
  website: z.url().max(2048).nullable().optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappPhone: z.string().trim().min(1).max(64).nullable().optional(),
  logoUrl: z.url().max(2048).nullable().optional(),
  includeLogoInSignature: z.boolean().optional(),
  /** DEPRECATED free-text signature; generated outreach does not read it. */
  signature: z.string().max(4000).nullable().optional(),
  status: SenderProfileStatusSchema.optional(),
  emailAccountId: z.uuid().nullable().optional(),
});

/** Public read shape — identity plus an optional mailbox-connection reference. */
export const SenderProfileResponseSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  senderName: z.string(),
  senderTitle: z.string().nullable(),
  companyName: z.string().nullable(),
  fromEmail: z.string(),
  replyToEmail: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  whatsappEnabled: z.boolean(),
  whatsappPhone: z.string().nullable(),
  logoUrl: z.string().nullable(),
  includeLogoInSignature: z.boolean(),
  signature: z.string().nullable(),
  status: SenderProfileStatusSchema,
  emailAccountId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The WhatsApp number actually used for the closing: the dedicated WhatsApp
 * number when set, otherwise the main phone, otherwise none (never invented).
 */
export function resolveWhatsAppPhone(
  phone: string | null | undefined,
  whatsappPhone: string | null | undefined,
): string | null {
  const dedicated = whatsappPhone?.trim();
  if (dedicated) return dedicated;
  const main = phone?.trim();
  return main ? main : null;
}

/**
 * True when the WhatsApp setting is usable: disabled always passes; enabled
 * requires a resolvable number (dedicated or main phone).
 */
export function isWhatsAppConfiguredValid(input: {
  whatsappEnabled: boolean;
  phone: string | null | undefined;
  whatsappPhone: string | null | undefined;
}): boolean {
  if (!input.whatsappEnabled) return true;
  return resolveWhatsAppPhone(input.phone, input.whatsappPhone) !== null;
}

export type SenderProfileStatus = z.infer<typeof SenderProfileStatusSchema>;
export type CreateSenderProfileInput = z.infer<
  typeof CreateSenderProfileSchema
>;
export type UpdateSenderProfileInput = z.infer<
  typeof UpdateSenderProfileSchema
>;
export type SenderProfileResponse = z.infer<typeof SenderProfileResponseSchema>;
