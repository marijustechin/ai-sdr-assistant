import type {
  ProductFactRecord,
  ProductRecord,
} from '../../products-and-offers/domain/types.js';

/**
 * Deterministic price-inquiry (RFQ) content generation from persisted data only.
 *
 * The specification is grounded strictly in the persisted product row and its
 * CONFIRMED + OPERATIONAL facts (the same facts the Research Context may assert);
 * PENDING/RESTRICTED facts are ignored and no attribute is ever invented. The
 * result is stable for the same persisted inputs so it is testable.
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

/** A locale template for the greeting, request text and closing. */
interface LocaleTemplate {
  greetingNamed: (name: string) => string;
  greetingGeneric: string;
  subject: (productName: string) => string;
  requestLine: string;
  quoteHeading: string;
  quoteItems: string[];
  closingPhrase: string;
}

const EN: LocaleTemplate = {
  greetingNamed: (name) => `Dear ${name},`,
  greetingGeneric: 'Hello,',
  subject: (productName) => `Price inquiry: ${productName}`,
  requestLine:
    'We would like to request a quotation for the following product / specification:',
  quoteHeading: 'Please quote:',
  quoteItems: [
    'your current price;',
    'the pricing unit (e.g. m³, m², piece, pack);',
    'the minimum order quantity (MOQ);',
    'the Incoterm;',
    'the loading / dispatch location;',
    'the lead time / availability;',
    'whether VAT is included;',
    'the quotation validity.',
  ],
  closingPhrase: 'Best regards,',
};

/**
 * Implemented locales. Only English exists today; future locales (`de`, `fi`,
 * `lt`, …) register here. A requested locale that is not implemented resolves to
 * English so the greeting, request text and closing always share one language.
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
  specificationLines: string[];
  recipientName: string | null;
  senderName: string;
  senderTitle: string | null;
  senderCompany: string | null;
}

export interface PriceInquiryContent {
  locale: string;
  subject: string;
  body: string;
}

/**
 * Concise professional price inquiry. It only asks; it never asserts volume,
 * frequency, destination, urgency, purchasing authority, or a company
 * representation beyond the configured sender identity. The closing is built
 * from structured identity data (sender name, optional role/title, optional
 * company) — each line appears at most once, no company line is invented, and a
 * stored signature is never appended.
 */
export function buildPriceInquiryContent(
  input: PriceInquiryContentInput,
): PriceInquiryContent {
  const template = LOCALES[input.locale] ?? EN;
  const subject = template.subject(input.productName).slice(0, 512);
  const greeting = input.recipientName
    ? template.greetingNamed(input.recipientName)
    : template.greetingGeneric;
  const spec = input.specificationLines.join('\n');
  const quote = template.quoteItems.map((item, index) => `${index + 1}. ${item}`);

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

  const body = [
    greeting,
    '',
    template.requestLine,
    '',
    spec,
    '',
    template.quoteHeading,
    ...quote,
    '',
    ...closingLines,
  ].join('\n');

  return { locale: input.locale, subject, body };
}
