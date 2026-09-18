import { z } from 'zod';

/**
 * Public business-contact contracts (write side).
 *
 * A contact stores values exactly as published on a source; normalization for
 * comparison happens server-side and never replaces the original value. No email
 * pattern, name, job title or phone country code is inferred.
 */

export const ContactTypeSchema = z.enum(['GENERAL_COMPANY', 'NAMED_PERSON']);

export const ContactUsabilitySchema = z.enum(['USABLE', 'UNUSABLE']);

export const ContactDeliverabilitySchema = z.enum([
  'NOT_VERIFIED',
  'VERIFIED',
  'UNKNOWN',
]);

/** One supporting source: where the contact was published and the excerpt. */
export const ContactSourceInputSchema = z.strictObject({
  url: z.url().max(2048),
  title: z.string().trim().min(1).max(512).optional(),
  publisher: z.string().trim().min(1).max(255).optional(),
  sourceType: z.string().trim().min(1).max(64).optional(),
  retrievedAt: z.coerce.date(),
  excerptText: z.string().trim().min(1).max(20000),
});

/**
 * Registers or refreshes a contact for one company. A contact must carry at
 * least one channel (email, phone or contact-page URL); a named-person contact
 * requires a person name, and a job title is only accepted alongside a name.
 */
export const CreateContactSchema = z
  .strictObject({
    contactType: ContactTypeSchema,
    email: z.email().max(320).optional(),
    phone: z.string().trim().min(1).max(64).optional(),
    contactPageUrl: z.url().max(2048).optional(),
    personName: z.string().trim().min(1).max(255).optional(),
    personJobTitle: z.string().trim().min(1).max(255).optional(),
    unknownsText: z.string().trim().min(1).max(4000).optional(),
    deliverabilityStatus: ContactDeliverabilitySchema.optional(),
    source: ContactSourceInputSchema,
  })
  .refine(
    (value) =>
      value.email !== undefined ||
      value.phone !== undefined ||
      value.contactPageUrl !== undefined,
    { message: 'a contact requires an email, phone or contact-page URL' },
  )
  .refine(
    (value) =>
      value.contactType !== 'NAMED_PERSON' || value.personName !== undefined,
    { message: 'a NAMED_PERSON contact requires personName' },
  )
  .refine(
    (value) =>
      value.personJobTitle === undefined || value.personName !== undefined,
    { message: 'personJobTitle requires personName' },
  );

/**
 * Operator/agent update of a contact's usability (with an optional reason) and,
 * separately, its deliverability status. Values are never edited here.
 */
export const UpdateContactSchema = z.strictObject({
  usabilityStatus: ContactUsabilitySchema,
  unusableReason: z.string().trim().min(1).max(2000).optional(),
  deliverabilityStatus: ContactDeliverabilitySchema.optional(),
});

export type ContactType = z.infer<typeof ContactTypeSchema>;
export type ContactUsability = z.infer<typeof ContactUsabilitySchema>;
export type ContactDeliverability = z.infer<typeof ContactDeliverabilitySchema>;
export type ContactSourceInput = z.infer<typeof ContactSourceInputSchema>;
export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
