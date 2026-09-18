/**
 * Deterministic identity helpers for candidate companies and leads.
 *
 * Company identity is a normalized name + normalized country so repeated
 * submissions of the same organisation resolve to one row. The lead dedup key
 * scopes that identity to one opportunity. Normalization is display-preserving
 * (the original `name` is stored unchanged) — it only drives matching.
 *
 * The separator is U+001F (unit separator), never U+0000: a NUL byte is not
 * valid in PostgreSQL text/varchar values.
 */

function collapse(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeCompanyName(name: string): string {
  return collapse(name);
}

export function companyIdentityKey(
  name: string,
  country?: string | null,
): string {
  const countryKey = country ? collapse(country) : '';
  return `${collapse(name)}\u001F${countryKey}`;
}

export function leadDedupKey(
  opportunityId: string,
  identityKey: string,
): string {
  return `${opportunityId}\u001F${identityKey}`;
}
