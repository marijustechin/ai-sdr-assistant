import { z } from 'zod';

/**
 * Email-account contracts (the technical mailbox connection).
 *
 * An email account owns SMTP (sending) and IMAP (monitoring) transport settings
 * for a password-authenticated mailbox. Passwords are write-only secrets: they
 * are never part of a response, and reads expose only whether a password is
 * configured. On update, omitting a password preserves the stored secret;
 * replacement and clearing are explicit. Transport is executed only by the
 * bounded verification actions below (connection check, bounded read, single
 * controlled test send).
 */

export const EmailAccountStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
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

/** Bounded verification result (no message content, no secrets). */
export const MailboxVerificationResponseSchema = z.strictObject({
  ok: z.boolean(),
  detail: z.string(),
});

/**
 * Explicit, single-recipient SMTP test send. `confirm` must be `true`: the
 * action is never reachable by accident.
 */
export const MailboxTestSendSchema = z.strictObject({
  to: email,
  confirm: z.literal(true),
});

export const MailboxTestSendResponseSchema = z.strictObject({
  ok: z.boolean(),
  detail: z.string(),
  messageId: z.string().nullable(),
});

export type EmailAccountStatus = z.infer<typeof EmailAccountStatusSchema>;
export type EmailTlsMode = z.infer<typeof EmailTlsModeSchema>;
export type CreateEmailAccountInput = z.infer<typeof CreateEmailAccountSchema>;
export type UpdateEmailAccountInput = z.infer<typeof UpdateEmailAccountSchema>;
export type EmailAccountResponse = z.infer<typeof EmailAccountResponseSchema>;
export type MailboxVerificationResponse = z.infer<
  typeof MailboxVerificationResponseSchema
>;
export type MailboxTestSendInput = z.infer<typeof MailboxTestSendSchema>;
export type MailboxTestSendResponse = z.infer<
  typeof MailboxTestSendResponseSchema
>;
