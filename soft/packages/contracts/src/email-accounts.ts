import { z } from 'zod';

/**
 * Email-account contracts (the technical mailbox connection).
 *
 * An email account owns SMTP (sending, later) and IMAP (monitoring, later)
 * transport settings. Passwords are write-only secrets: they are never part of a
 * response, and reads expose only whether a password is configured. On update,
 * omitting a password preserves the stored secret; replacement and clearing are
 * explicit. No transport is executed by these endpoints.
 */

export const EmailAccountStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const EmailAuthKindSchema = z.enum(['PASSWORD', 'OAUTH2']);
export const EmailTlsModeSchema = z.enum(['NONE', 'STARTTLS', 'SSL_TLS']);

const email = z.email().max(320);
const host = z.string().trim().min(1).max(255);
const port = z.number().int().min(1).max(65535);
const username = z.string().trim().min(1).max(255);
const password = z.string().min(1).max(4096);

const PROVIDER_MAX = 64;

/** SMTP host/port/TLS mode must be set together (or all absent). */
function smtpTriplet(value: {
  smtpHost?: unknown;
  smtpPort?: unknown;
  smtpTlsMode?: unknown;
}): boolean {
  const present = [value.smtpHost, value.smtpPort, value.smtpTlsMode].filter(
    (part) => part !== undefined,
  );
  return present.length === 0 || present.length === 3;
}

/** IMAP host/port/TLS mode must be set together (or all absent). */
function imapTriplet(value: {
  imapHost?: unknown;
  imapPort?: unknown;
  imapTlsMode?: unknown;
}): boolean {
  const present = [value.imapHost, value.imapPort, value.imapTlsMode].filter(
    (part) => part !== undefined,
  );
  return present.length === 0 || present.length === 3;
}

export const CreateEmailAccountSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(255),
    accountEmail: email,
    status: EmailAccountStatusSchema.optional(),
    authKind: EmailAuthKindSchema.optional(),
    provider: z.string().trim().min(1).max(PROVIDER_MAX).optional(),
    smtpHost: host.optional(),
    smtpPort: port.optional(),
    smtpTlsMode: EmailTlsModeSchema.optional(),
    smtpUsername: username.optional(),
    smtpPassword: password.optional(),
    imapHost: host.optional(),
    imapPort: port.optional(),
    imapTlsMode: EmailTlsModeSchema.optional(),
    imapUsername: username.optional(),
    imapPassword: password.optional(),
    credentialsShared: z.boolean().optional(),
  })
  .refine(smtpTriplet, {
    message: 'SMTP host, port and TLS mode must be provided together',
  })
  .refine(imapTriplet, {
    message: 'IMAP host, port and TLS mode must be provided together',
  })
  .refine(
    (value) => value.smtpPassword === undefined || value.smtpUsername !== undefined,
    { message: 'an SMTP password requires a username' },
  )
  .refine(
    (value) => value.imapPassword === undefined || value.imapUsername !== undefined,
    { message: 'an IMAP password requires a username' },
  )
  .refine(
    (value) =>
      value.credentialsShared !== true ||
      (value.imapUsername === undefined && value.imapPassword === undefined),
    {
      message:
        'when credentials are shared with SMTP, separate IMAP credentials must not be set',
    },
  );

/**
 * Partial update. `smtpPassword`/`imapPassword` replace; `clearSmtpPassword`/
 * `clearImapPassword` clear explicitly.
 */
export const UpdateEmailAccountSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(255).optional(),
    accountEmail: email.optional(),
    status: EmailAccountStatusSchema.optional(),
    authKind: EmailAuthKindSchema.optional(),
    provider: z.string().trim().min(1).max(PROVIDER_MAX).nullable().optional(),
    smtpHost: host.nullable().optional(),
    smtpPort: port.nullable().optional(),
    smtpTlsMode: EmailTlsModeSchema.nullable().optional(),
    smtpUsername: username.nullable().optional(),
    smtpPassword: password.optional(),
    clearSmtpPassword: z.boolean().optional(),
    imapHost: host.nullable().optional(),
    imapPort: port.nullable().optional(),
    imapTlsMode: EmailTlsModeSchema.nullable().optional(),
    imapUsername: username.nullable().optional(),
    imapPassword: password.optional(),
    clearImapPassword: z.boolean().optional(),
    credentialsShared: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.smtpPassword === undefined || value.clearSmtpPassword === undefined,
    { message: 'provide either smtpPassword or clearSmtpPassword, not both' },
  )
  .refine(
    (value) =>
      value.imapPassword === undefined || value.clearImapPassword === undefined,
    { message: 'provide either imapPassword or clearImapPassword, not both' },
  );

/** Public read shape — never contains a password, only its presence. */
export const EmailAccountResponseSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  accountEmail: z.string(),
  status: EmailAccountStatusSchema,
  authKind: EmailAuthKindSchema,
  provider: z.string().nullable(),
  smtpHost: z.string().nullable(),
  smtpPort: z.number().int().nullable(),
  smtpTlsMode: EmailTlsModeSchema.nullable(),
  smtpUsername: z.string().nullable(),
  smtpPasswordConfigured: z.boolean(),
  imapHost: z.string().nullable(),
  imapPort: z.number().int().nullable(),
  imapTlsMode: EmailTlsModeSchema.nullable(),
  imapUsername: z.string().nullable(),
  imapPasswordConfigured: z.boolean(),
  credentialsShared: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmailAccountStatus = z.infer<typeof EmailAccountStatusSchema>;
export type EmailAuthKind = z.infer<typeof EmailAuthKindSchema>;
export type EmailTlsMode = z.infer<typeof EmailTlsModeSchema>;
export type CreateEmailAccountInput = z.infer<typeof CreateEmailAccountSchema>;
export type UpdateEmailAccountInput = z.infer<typeof UpdateEmailAccountSchema>;
export type EmailAccountResponse = z.infer<typeof EmailAccountResponseSchema>;
