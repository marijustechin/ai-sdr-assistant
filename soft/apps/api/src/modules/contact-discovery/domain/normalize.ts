import { createHash } from 'node:crypto';

/**
 * Normalization for comparison/deduplication only. The original values are
 * always stored unchanged; nothing here is ever written back to the operator.
 * No email pattern, name, job title or phone country code is inferred.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Digits and a leading `+` only — never adds or guesses a country code. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s().-]/g, '');
}

/** Lower-cases scheme/host and drops a trailing slash; preserves path/search. */
export function normalizePageUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

export function normalizePersonName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface ContactIdentity {
  companyId: string;
  contactType: 'GENERAL_COMPANY' | 'NAMED_PERSON';
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  normalizedPageUrl: string | null;
  personName?: string | null;
}

/**
 * Deterministic contact identity: company + type + strongest channel + (for a
 * named person) the normalized name. Hashed to a fixed width so a long URL
 * cannot overflow the key column. The same observation always yields the same
 * key, so repeated submissions are idempotent.
 */
export function contactDedupKey(identity: ContactIdentity): string {
  const channel =
    identity.normalizedEmail ??
    identity.normalizedPhone ??
    identity.normalizedPageUrl ??
    '';
  const name =
    identity.contactType === 'NAMED_PERSON' && identity.personName
      ? normalizePersonName(identity.personName)
      : '';
  const composite = [
    identity.companyId,
    identity.contactType,
    channel,
    name,
  ].join('\u001F');
  return createHash('sha256').update(composite, 'utf8').digest('hex');
}
