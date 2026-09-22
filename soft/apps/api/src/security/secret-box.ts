import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Authenticated encryption for stored mailbox secrets (SMTP/IMAP passwords)
 * using AES-256-GCM.
 *
 * The 32-byte key is read **only** from the server environment
 * (`EMAIL_SECRETS_KEY`, base64 or hex). It is never stored in the database or
 * Git, and is never generated at startup: if it is missing, saving a credential
 * fails clearly while accounts without secrets keep working. Ciphertext format:
 * `v1.<iv>.<tag>.<ciphertext>` (base64url).
 */

const KEY_ENV = 'EMAIL_SECRETS_KEY';
const PREFIX = 'v1';

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super('EMAIL_SECRETS_KEY is not configured');
    this.name = 'EncryptionNotConfiguredError';
  }
}

export class SecretDecryptionError extends Error {
  constructor() {
    super('stored secret could not be decrypted');
    this.name = 'SecretDecryptionError';
  }
}

function loadKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new EncryptionNotConfiguredError();
  }
  const candidates = [Buffer.from(raw, 'base64'), Buffer.from(raw, 'hex')];
  const key = candidates.find((candidate) => candidate.length === 32);
  if (!key) {
    throw new EncryptionNotConfiguredError();
  }
  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new SecretDecryptionError();
  }
  const key = loadKey();
  const iv = Buffer.from(parts[1] as string, 'base64url');
  const tag = Buffer.from(parts[2] as string, 'base64url');
  const ciphertext = Buffer.from(parts[3] as string, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new SecretDecryptionError();
  }
}
