/**
 * Conservative structured-field extraction from a supplier reply's plain text.
 *
 * Every value is derived from an explicit span of the reply; a field that is not
 * clearly present stays null and a warning is recorded. Values are never
 * invented and no unit conversion happens here (that is a later price-
 * intelligence task). Each populated field keeps a short supporting excerpt.
 */

export interface ExtractedQuote {
  priceText: string | null;
  priceAmount: number | null;
  currency: string | null;
  priceUnit: string | null;
  moqText: string | null;
  incoterm: string | null;
  loadingLocationText: string | null;
  leadTimeText: string | null;
  validityText: string | null;
  vatIncluded: boolean | null;
  qualificationText: string | null;
  fieldProvenance: Record<string, string>;
  warnings: string[];
}

const MAX_EXCERPT = 200;

const CURRENCY_TOKENS: Array<[RegExp, string]> = [
  [/us\$/i, 'USD'],
  [/€/i, 'EUR'],
  [/\$/, 'USD'],
  [/£/i, 'GBP'],
  [/\beur\b/i, 'EUR'],
  [/\busd\b/i, 'USD'],
  [/\bgbp\b/i, 'GBP'],
  [/\bpln\b/i, 'PLN'],
  [/zł/i, 'PLN'],
  [/\bzl\b/i, 'PLN'],
  [/\bsek\b/i, 'SEK'],
  [/\bnok\b/i, 'NOK'],
  [/\bdkk\b/i, 'DKK'],
  [/\bchf\b/i, 'CHF'],
  [/\bcad\b/i, 'CAD'],
  [/\baud\b/i, 'AUD'],
];

const CURRENCY_ALTERNATION =
  'us\\$|€|£|\\$|eur|usd|gbp|pln|zł|zl|sek|nok|dkk|chf|cad|aud';

const UNIT_PATTERNS: Array<[RegExp, string]> = [
  [/\bm3\b|\bm³\b|\bcbm\b/i, 'm3'],
  [/\bm2\b|\bm²\b|\bsqm\b|\bsq\.?\s?m\b/i, 'm2'],
  [/\bpcs\b|\bpieces?\b|\bunits?\b|\bpc\b/i, 'piece'],
  [/\bpacks?\b|\bbags?\b/i, 'pack'],
  [/\bpallets?\b/i, 'pallet'],
  [/\btonnes?\b|\btons?\b/i, 'ton'],
  [/\bkg\b|\bkilograms?\b/i, 'kg'],
  [/\brolls?\b/i, 'roll'],
  [/\bsets?\b/i, 'set'],
  [/\bbundles?\b/i, 'bundle'],
  [/\bloads?\b/i, 'load'],
];

const INCOTERMS = [
  'EXW',
  'FOB',
  'CIF',
  'CFR',
  'DAP',
  'DDP',
  'FCA',
  'CPT',
  'CIP',
  'FAS',
];

function excerpt(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > MAX_EXCERPT ? trimmed.slice(0, MAX_EXCERPT) : trimmed;
}

/** Parses an amount only when the separators are unambiguous; else null. */
function parseAmount(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, '');
  const commas = (value.match(/,/g) ?? []).length;
  const dots = (value.match(/\./g) ?? []).length;
  if (commas + dots > 1) return null;
  const separator = commas === 1 ? ',' : dots === 1 ? '.' : null;
  if (separator) {
    const fraction = value.split(separator)[1] ?? '';
    // One separator followed by exactly 3 digits is more likely a thousands
    // separator than a decimal — do not guess.
    if (fraction.length === 3) return null;
    if (fraction.length > 2) return null;
  }
  const normalized = separator ? value.replace(separator, '.') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function matchPrice(
  text: string,
): { text: string; amount: number | null } | 'ambiguous' | null {
  const before = new RegExp(
    `(${CURRENCY_ALTERNATION})\\s*([0-9][0-9\\s.,]*)`,
    'gi',
  );
  const after = new RegExp(
    `([0-9][0-9\\s.,]*)\\s*(${CURRENCY_ALTERNATION})`,
    'gi',
  );
  const matches: Array<{ snippet: string; amountText: string }> = [];
  for (const [regex, group] of [
    [before, 2],
    [after, 1],
  ] as const) {
    let hit: RegExpExecArray | null;
    while ((hit = regex.exec(text)) !== null) {
      matches.push({
        snippet: hit[0],
        amountText: (hit[group] as string) ?? '',
      });
    }
  }
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    const values = new Set(matches.map((m) => m.amountText.trim().replace(/\s/g, '')));
    if (values.size > 1) return 'ambiguous'; // multiple distinct prices
  }
  const first = matches[0] as { snippet: string; amountText: string };
  return { text: excerpt(first.snippet), amount: parseAmount(first.amountText) };
}

function firstGroup(text: string, regex: RegExp, group = 1): string | null {
  const match = regex.exec(text);
  const value = match?.[group];
  return value && value.trim().length > 0 ? excerpt(value) : null;
}

export function extractQuote(text: string): ExtractedQuote {
  const warnings: string[] = [];
  const fieldProvenance: Record<string, string> = {};
  const source = typeof text === 'string' ? text : '';

  const price = matchPrice(source);
  let priceText: string | null = null;
  let priceAmount: number | null = null;
  let currency: string | null = null;
  if (price === 'ambiguous') {
    warnings.push('multiple_prices_found');
  } else if (price) {
    priceText = price.text;
    priceAmount = price.amount;
    for (const [pattern, code] of CURRENCY_TOKENS) {
      if (pattern.test(price.text)) {
        currency = code;
        break;
      }
    }
    fieldProvenance['priceText'] = price.text;
    if (priceAmount !== null) fieldProvenance['priceAmount'] = price.text;
    if (currency !== null) fieldProvenance['currency'] = price.text;
    if (priceAmount === null) warnings.push('price_amount_ambiguous');
    if (currency === null) warnings.push('currency_not_stated');
  } else {
    warnings.push('price_not_found');
  }

  let priceUnit: string | null = null;
  for (const [pattern, unit] of UNIT_PATTERNS) {
    if (pattern.test(source)) {
      priceUnit = unit;
      break;
    }
  }
  if (priceUnit) fieldProvenance['priceUnit'] = priceText ?? priceUnit;
  else warnings.push('unit_not_stated');

  const moqText = firstGroup(
    source,
    /(?:moq|minimum order(?: quantity)?|min\.?\s*order(?: qty)?|minimum quantity|min\s*qty|minimum)[^a-z0-9]{0,4}([^\n]{1,120})/i,
  );
  if (moqText) fieldProvenance['moqText'] = moqText;

  const incotermMatch = new RegExp(`\\b(${INCOTERMS.join('|')})\\b`, 'i').exec(
    source,
  );
  const incoterm = incotermMatch ? incotermMatch[1]!.toUpperCase() : null;
  if (incoterm) fieldProvenance['incoterm'] = incoterm;

  const loadingLocationText = firstGroup(
    source,
    /(?:loading|dispatch|ex-?works|origin|pickup|shipment|port of loading)\s*(?:location|point|port|warehouse|place)?\s*[:\-–]\s*([^\n.;]{1,80})/i,
  );
  if (loadingLocationText) fieldProvenance['loadingLocationText'] = loadingLocationText;

  const leadTimeText = firstGroup(
    source,
    /(?:lead\s*time|delivery(?:\s*time)?|dispatch|availability|ship(?:ping)?(?:\s*(?:time|date))?)\s*[:\-–]?\s*([^\n.;]{1,80})/i,
  );
  if (leadTimeText) fieldProvenance['leadTimeText'] = leadTimeText;

  const validityText = firstGroup(
    source,
    /(?:valid(?:ity)?|valid\s*until|offer\s*valid|price\s*valid|quotation\s*valid)[^a-z0-9]{0,4}([^\n.;]{1,80})/i,
  );
  if (validityText) fieldProvenance['validityText'] = validityText;

  let vatIncluded: boolean | null = null;
  if (/\bvat\b|\btax\b/i.test(source)) {
    const included =
      /(?:incl\.?|included?|including)\s+(?:the\s+)?(?:vat|tax)\b/i.test(source) ||
      /\b(?:vat|tax)\s+(?:incl\.?|included?|including)\b/i.test(source);
    const excluded =
      /(?:excl\.?|excluded?|excluding|without|plus|net of)\s+(?:the\s+)?(?:vat|tax)\b/i.test(
        source,
      ) ||
      /\b(?:vat|tax)\s+(?:excl\.?|excluded?|excluding|not included|extra)\b/i.test(
        source,
      );
    if (included) vatIncluded = true;
    else if (excluded) vatIncluded = false;
  }
  if (vatIncluded !== null) {
    fieldProvenance['vatIncluded'] = vatIncluded ? 'VAT included' : 'VAT excluded';
  }

  const qualificationText = firstGroup(
    source,
    /(deviat\w*|alternative\w*|substitut\w*|equivalent\w*|instead of|qualif\w*|variant\w*|not available|out of stock|discontinu\w*)\b([^\n]{0,120})/i,
  );
  if (qualificationText) fieldProvenance['qualificationText'] = qualificationText;

  return {
    priceText,
    priceAmount,
    currency,
    priceUnit,
    moqText,
    incoterm,
    loadingLocationText,
    leadTimeText,
    validityText,
    vatIncluded,
    qualificationText,
    fieldProvenance,
    warnings,
  };
}
