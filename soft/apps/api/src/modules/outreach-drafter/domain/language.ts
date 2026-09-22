/**
 * Generic language selection for an initial outreach draft.
 *
 * The language is derived from available context (the company's recorded
 * country) — never from a hardcoded product assumption. When no local language
 * can be derived, English is chosen. The choice and its rationale are recorded.
 */

const COUNTRY_LANGUAGE: Record<string, string> = {
  lithuania: 'lt',
  latvia: 'lv',
  estonia: 'et',
  estia: 'et',
};

export interface LanguageChoice {
  language: string;
  rationale: string;
}

export function selectLanguage(
  country: string | null | undefined,
): LanguageChoice {
  const key = (country ?? '').trim().toLowerCase();
  const mapped = COUNTRY_LANGUAGE[key];
  if (mapped) {
    return {
      language: mapped,
      rationale: `Language derived from the company's recorded country (${country}).`,
    };
  }
  return {
    language: 'en',
    rationale:
      'No local language could be derived from the recorded company country; English used.',
  };
}
