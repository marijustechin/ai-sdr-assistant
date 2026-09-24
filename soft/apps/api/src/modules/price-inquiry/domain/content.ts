import type {
  ProductFactRecord,
  ProductRecord,
} from '../../products-and-offers/domain/types.js';

/**
 * Deterministic price-inquiry content generation from persisted data only.
 *
 * The first-contact message is deliberately short and human: a greeting, one
 * sentence saying where the product was found and asking for the current price,
 * up to two optional clarifying questions (pricing unit and/or MOQ), a simple
 * follow-up line and a closing built from structured sender identity. It never
 * dumps a numbered procurement checklist, and it never asserts volume, urgency,
 * destination, purchasing authority or a company identity that was not
 * configured. The persisted specification is still computed separately (for the
 * draft's grounded `specificationSummary`), but it is not pasted into the email.
 *
 * The result is stable for the same persisted inputs so it is testable.
 */

const MAX_FACTS = 25;

export interface SpecificationGrounding {
  lines: string[];
  summary: string;
}

function factValue(fact: ProductFactRecord): string | null {
  if (fact.valueNumeric !== null) {
    const unit = fact.unit ? ` ${fact.unit}` : '';
    return `${fact.valueNumeric}${unit}`;
  }
  if (fact.valueText !== null && fact.valueText.trim().length > 0) {
    const unit = fact.unit ? ` ${fact.unit}` : '';
    return `${fact.valueText}${unit}`;
  }
  return null;
}

function hasFactValue(fact: ProductFactRecord): boolean {
  return (
    fact.valueNumeric !== null ||
    (fact.valueText !== null && fact.valueText.trim().length > 0)
  );
}

/** Builds the specification lines from the persisted product and its facts. */
export function buildSpecification(
  product: ProductRecord,
  facts: ProductFactRecord[],
): SpecificationGrounding {
  const lines: string[] = [`Product: ${product.name}`];
  if (product.scientificName) {
    lines.push(`Species / material: ${product.scientificName}`);
  }
  if (product.category) {
    lines.push(`Category: ${product.category}`);
  }

  const usableFacts = facts
    .filter(
      (fact) =>
        fact.status === 'CONFIRMED' && fact.visibility === 'OPERATIONAL',
    )
    .sort((a, b) => a.key.localeCompare(b.key) || a.id.localeCompare(b.id))
    .slice(0, MAX_FACTS);

  for (const fact of usableFacts) {
    const value = factValue(fact);
    if (value !== null) {
      lines.push(`${fact.key}: ${value}`);
    }
  }

  return { lines, summary: lines.join('\n') };
}

export interface PriceInquiryClarifications {
  /** Ask for the pricing unit only when no price unit is already on record. */
  askPricingUnit: boolean;
  /** Ask for the MOQ only when no MOQ is already on record. */
  askMoq: boolean;
}

const MOQ_KEY = /(moq|minimum\s*order|min\.?\s*order|minimum\s*quantity|min\s*qty)/i;
const UNIT_KEY = /(price[\s_-]?unit|pricing[\s_-]?unit|\bunit\b|price\s*basis)/i;

/**
 * Decides which clarifications the first email still needs, using only
 * `CONFIRMED + OPERATIONAL` product facts (the same facts the Research Context
 * may assert). If the public page already exposes a clear pricing unit or MOQ,
 * the corresponding question is dropped. Never asserts anything it cannot see.
 */
export function assessPriceInquiryClarifications(
  facts: ProductFactRecord[],
): PriceInquiryClarifications {
  const usable = facts.filter(
    (fact) => fact.status === 'CONFIRMED' && fact.visibility === 'OPERATIONAL',
  );
  const moqKnown = usable.some(
    (fact) => hasFactValue(fact) && MOQ_KEY.test(fact.key),
  );
  const unitKnown = usable.some((fact) => {
    if (!hasFactValue(fact)) return false;
    if (UNIT_KEY.test(fact.key)) return true;
    // A price fact that already carries a unit (e.g. `Price` + unit `m3`).
    return /price/i.test(fact.key) && (fact.unit?.trim().length ?? 0) > 0;
  });
  return { askPricingUnit: !unitKnown, askMoq: !moqKnown };
}

/** A locale template for the greeting, message sentences and closing. */
interface LocaleTemplate {
  greetingNamed: (name: string) => string;
  greetingGeneric: string;
  subject: (productName: string) => string;
  /** Where the product was found; a neutral default when nothing is known. */
  defaultFoundOn: string;
  foundSentence: (productName: string, foundOn: string) => string;
  clarificationSentence: (topics: string) => string;
  pricingUnitTopic: string;
  moqTopic: string;
  topicJoiner: string;
  followUpSentence: string;
  closingPhrase: string;
}

const EN: LocaleTemplate = {
  greetingNamed: (name) => `Dear ${name},`,
  greetingGeneric: 'Hello,',
  subject: (productName) => `Price inquiry: ${productName}`,
  defaultFoundOn: 'your website',
  foundSentence: (productName, foundOn) =>
    `I found ${productName} on ${foundOn} and would like to ask about the current price.`,
  clarificationSentence: (topics) =>
    `If possible, please also let me know ${topics}.`,
  pricingUnitTopic: 'the pricing unit',
  moqTopic: 'the minimum order quantity',
  topicJoiner: ' and ',
  followUpSentence: 'I look forward to your reply.',
  closingPhrase: 'Best regards,',
};

/**
 * Implemented locales. Only English exists today; future locales (`de`, `fi`,
 * `lt`, …) register a `LocaleTemplate` here. A requested locale that is not
 * implemented resolves to English, and the resolved locale is what is reported —
 * English text is never labelled as another locale.
 */
const LOCALES: Readonly<Record<string, LocaleTemplate>> = { en: EN };

export const DEFAULT_PRICE_INQUIRY_LOCALE = 'en';

export function resolvePriceInquiryLocale(language: string | undefined): string {
  const candidate = (language ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return candidate && LOCALES[candidate] ? candidate : DEFAULT_PRICE_INQUIRY_LOCALE;
}

export function isPriceInquiryLocaleImplemented(language: string): boolean {
  return Object.prototype.hasOwnProperty.call(LOCALES, language.toLowerCase());
}

export interface PriceInquiryContentInput {
  locale: string;
  productName: string;
  /** Where the product was found; defaults to a neutral phrase. */
  foundOn?: string | null;
  recipientName: string | null;
  senderName: string;
  senderTitle: string | null;
  senderCompany: string | null;
  /** Defaults to `true` when not supplied. */
  askPricingUnit?: boolean;
  askMoq?: boolean;
}

export interface PriceInquiryContent {
  locale: string;
  subject: string;
  body: string;
}

/**
 * Short, natural first-contact price inquiry. It only asks (current price, and
 * optionally the pricing unit and MOQ); it never asserts volume, frequency,
 * destination, urgency, purchasing authority, or a company representation beyond
 * the configured sender identity. The closing is built from structured identity
 * data (sender name, optional role/title, optional company) — each line appears
 * at most once, no company line is invented, and a stored signature is never
 * appended.
 */
export function buildPriceInquiryContent(
  input: PriceInquiryContentInput,
): PriceInquiryContent {
  const template = LOCALES[input.locale] ?? EN;
  const subject = template.subject(input.productName).slice(0, 512);
  const greeting = input.recipientName
    ? template.greetingNamed(input.recipientName)
    : template.greetingGeneric;
  const foundOn = (input.foundOn ?? '').trim() || template.defaultFoundOn;

  const askPricingUnit = input.askPricingUnit ?? true;
  const askMoq = input.askMoq ?? true;
  const topics: string[] = [];
  if (askPricingUnit) topics.push(template.pricingUnitTopic);
  if (askMoq) topics.push(template.moqTopic);
  const clarification =
    topics.length > 0
      ? template.clarificationSentence(topics.join(template.topicJoiner))
      : null;

  // Closing: phrase + sender name + optional title + optional company, each once.
  const seen = new Set<string>();
  const closingLines = [
    template.closingPhrase,
    input.senderName,
    input.senderTitle,
    input.senderCompany,
  ].filter((line): line is string => {
    const trimmed = (line ?? '').trim();
    if (trimmed.length === 0) return false;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const lines = [
    greeting,
    '',
    template.foundSentence(input.productName, foundOn),
    '',
    ...(clarification ? [clarification, ''] : []),
    template.followUpSentence,
    '',
    ...closingLines,
  ];

  return { locale: input.locale, subject, body: lines.join('\n') };
}
