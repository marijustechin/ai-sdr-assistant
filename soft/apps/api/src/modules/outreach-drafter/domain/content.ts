/**
 * First-contact outreach content builder.
 *
 * Produces a short, human, evidence-backed B2B message that aims to generate
 * qualified interest — NOT to deliver the full commercial offer. It interpolates
 * persisted context/evidence strings (offer, category, observed activity, sender)
 * into a small localized scaffold and adds no commercial claim of its own.
 *
 * It deliberately includes NO concrete price, no specification dump, no
 * MOQ/Incoterm/lead-time block and exactly ONE question. Prices, MOQ, dimensions,
 * availability, lead time, samples and origin are intentionally left as topics
 * the recipient can ask about. The message never asserts the recipient's interest,
 * purchasing responsibility, or any unstated commercial term.
 *
 * Canonical body model: the human-editable canonical body is the message text
 * WITHOUT the closing/signature. The sendable plain-text `body` and the
 * `htmlBody` are DERIVED from the canonical body plus the structured sender
 * identity (and optional branding), so editing the canonical body can never
 * leave an old HTML body paired with new plain text.
 */

type RewriteLanguage = 'en' | 'lt';

/**
 * English third-person commerce verbs → the recipient-facing verb form per
 * language. Deliberately bounded: only patterns we can render safely and
 * idiomatically are listed. `en` uses the base verb after "you"; `lt` uses the
 * second-person plural form directly (no pronoun). Anything not listed falls
 * back to a neutral opener rather than an unsafe transformation.
 */
const VERB_FORMS: Record<string, Partial<Record<RewriteLanguage, string>>> = {
  sells: { en: 'sell', lt: 'prekiaujate' },
  offers: { en: 'offer', lt: 'siūlote' },
  supplies: { en: 'supply', lt: 'tiekiate' },
  manufactures: { en: 'manufacture', lt: 'gaminate' },
  produces: { en: 'produce', lt: 'gaminote' },
  distributes: { en: 'distribute', lt: 'platinate' },
  imports: { en: 'import', lt: 'importuojate' },
  exports: { en: 'export', lt: 'eksportuojate' },
  installs: { en: 'install', lt: 'montuojate' },
  fabricates: { en: 'fabricate', lt: 'gaminate' },
  builds: { en: 'build', lt: 'statote' },
  designs: { en: 'design', lt: 'projektuojate' },
  provides: { en: 'provide', lt: 'teikiate' },
  makes: { en: 'make', lt: 'gaminote' },
  sources: { en: 'source', lt: 'tiekiate' },
  uses: { en: 'use', lt: 'naudojate' },
};

const PHRASE_FORMS: ReadonlyArray<
  readonly [RegExp, Partial<Record<RewriteLanguage, string>>]
> = [
  [/^works with\b/i, { en: 'work with', lt: 'dirbate su' }],
  [/^deals in\b/i, { en: 'deal in', lt: 'prekiaujate' }],
  [/^focuses on\b/i, { en: 'focus on' }],
  [/^speciali[sz]es in\b/i, { en: 'specialise in' }],
];

function clauseFromRest(rest: string, language: RewriteLanguage): string | null {
  for (const [pattern, forms] of PHRASE_FORMS) {
    if (pattern.test(rest)) {
      const form = forms[language];
      if (!form) return null;
      const rewritten = rest.replace(pattern, form);
      return language === 'en' ? `you ${rewritten}` : rewritten;
    }
  }
  const words = rest.split(' ');
  const forms = VERB_FORMS[words[0]!.toLowerCase()];
  if (!forms) return null;
  const form = forms[language];
  if (!form) return null;
  const tail = words.slice(1).join(' ');
  const clause = tail ? `${form} ${tail}` : form;
  return language === 'en' ? `you ${clause}` : clause;
}

/**
 * Deterministically converts an English stored observation into a natural
 * recipient-facing `you <verb> …` clause for the bounded set of supported
 * patterns. **English only**: a single-language rule forbids mixing languages, so
 * non-English messages must use their own localized renderer (see
 * `renderLtObservation`) and otherwise fall back to a neutral, evidence-safe
 * sentence. Returns null when it cannot be rendered safely — the caller then uses
 * the neutral fallback rather than exposing raw database phrasing. No
 * unrestricted machine translation is performed.
 */
export function naturalizeObservation(
  observed: string,
  language: string = 'en',
): string | null {
  if (language !== 'en') return null;
  const lang: RewriteLanguage = 'en';
  const text = observed.trim().replace(/\s+/g, ' ').replace(/[.;]+$/, '');
  if (!text) return null;

  const companyIs = /^the company\s+(is|are)\s+(.+)$/i.exec(text);
  if (companyIs) {
    return `you are ${companyIs[2]!}`;
  }
  const company = /^the company\s+(.+)$/i.exec(text);
  if (company) {
    return clauseFromRest(company[1]!, lang) ?? `it ${company[1]}`;
  }
  return clauseFromRest(text, lang);
}

/** Second-person Lithuanian activity verb, with the grammatical case it governs. */
interface LtVerb {
  form: string;
  /** `acc` (gaminate pirtis) or `ins` (prekiaujate dailylentėmis). */
  objectCase: 'acc' | 'ins';
  /** Whether a "Lietuvoje" location phrase may be appended. */
  locationOk: boolean;
}

/**
 * Observed role → Lithuanian verb, in precedence order (a manufacturer that also
 * distributes is described by what it makes). Deliberately bounded; a role that
 * is not listed (e.g. COMPETITOR/END_USER) yields no phrase and falls back.
 */
const LT_VERB_BY_ROLE: ReadonlyArray<readonly [string, LtVerb]> = [
  ['MANUFACTURER', { form: 'gaminate', objectCase: 'acc', locationOk: false }],
  ['FABRICATOR', { form: 'gaminate', objectCase: 'acc', locationOk: false }],
  ['INSTALLER', { form: 'montuojate', objectCase: 'acc', locationOk: true }],
  ['BUILDER', { form: 'statote', objectCase: 'acc', locationOk: true }],
  ['DESIGNER', { form: 'projektuojate', objectCase: 'acc', locationOk: false }],
  ['DISTRIBUTOR', { form: 'prekiaujate', objectCase: 'ins', locationOk: false }],
  ['RETAILER', { form: 'prekiaujate', objectCase: 'ins', locationOk: false }],
  ['IMPORTER', { form: 'prekiaujate', objectCase: 'ins', locationOk: false }],
];

/** Bounded Lithuanian renderings of generic product categories (acc/ins cases). */
const LT_PRODUCT_TERMS: Record<string, { acc: string; ins: string }> = {
  sauna_cladding: { acc: 'pirties dailylentes', ins: 'pirties dailylentėmis' },
  cladding: { acc: 'dailylentes', ins: 'dailylentėmis' },
  bench: { acc: 'gultų medieną', ins: 'gultų mediena' },
  decking: { acc: 'terasines lentas', ins: 'terasinėmis lentomis' },
  sauna: { acc: 'pirtis', ins: 'pirtimis' },
  hot_tub: { acc: 'sodo kubilus', ins: 'sodo kubilais' },
};

const LT_RE = {
  saunaCladding: /sauna\s+cladding|pirties\s+dailylent|pirtinių\s+dailylent/i,
  cladding: /\bcladding\b|dailylent/i,
  bench: /\bbench(?:es)?\b|\bbench\s+timber\b|gult/i,
  decking: /\bdecking\b|terasin/i,
  sauna: /\bsaunas?\b|pirt/i,
  hotTub: /hot\s*tubs?|sodo\s+kubil|kubil/i,
  lithuania: /lithuania|lietuv/i,
};

function ltVerbForRoles(roles: readonly string[]): LtVerb | null {
  for (const [role, verb] of LT_VERB_BY_ROLE) {
    if (roles.includes(role)) return verb;
  }
  return null;
}

/**
 * Bounded, deterministic **Lithuanian** personalization. It classifies ONE short
 * evidence-backed activity/category from the lead's observed roles + activity
 * text and renders a fully-Lithuanian clause (never raw English prose). Returns
 * null (→ the neutral LT fallback) when the observation cannot be mapped safely.
 */
export function renderLtObservation(
  observedRoles: readonly string[],
  observedActivityText: string,
): string | null {
  const text = (observedActivityText ?? '').trim();
  if (!text) return null;
  const verb = ltVerbForRoles(observedRoles ?? []);
  if (!verb) return null;

  const roles = observedRoles ?? [];
  const isService = roles.includes('INSTALLER') || roles.includes('BUILDER');
  const categories: string[] = [];
  if (isService && LT_RE.sauna.test(text)) {
    categories.push('sauna');
  } else {
    if (LT_RE.saunaCladding.test(text)) categories.push('sauna_cladding');
    else if (LT_RE.cladding.test(text)) categories.push('cladding');
    if (LT_RE.bench.test(text)) categories.push('bench');
    if (LT_RE.decking.test(text) && !categories.includes('sauna_cladding')) {
      categories.push('decking');
    }
  }

  let keys: string[];
  if (categories.length > 0) {
    keys = categories.slice(0, 2);
  } else if (LT_RE.hotTub.test(text) && roles.includes('MANUFACTURER')) {
    keys = ['hot_tub'];
  } else if (
    LT_RE.sauna.test(text) &&
    (roles.includes('MANUFACTURER') || roles.includes('DESIGNER'))
  ) {
    keys = ['sauna'];
  } else {
    return null;
  }

  const objects = keys.map((key) =>
    verb.objectCase === 'ins' ? LT_PRODUCT_TERMS[key]!.ins : LT_PRODUCT_TERMS[key]!.acc,
  );
  let clause = `${verb.form} ${objects.join(' ir ')}`;
  if (verb.locationOk && LT_RE.lithuania.test(text)) clause += ' Lietuvoje';
  return clause;
}

/**
 * Localizes a generic product-category token inside a stored offer/product name
 * for Lithuanian prose (e.g. "Thermo Abachi Cladding" → "Thermo Abachi
 * dailylentės"). Brand/model identity is preserved; only the generic category
 * word is mapped.
 */
export function localizeOfferForLt(offer: string): string {
  return offer
    .replace(/\bcladding\b/gi, 'dailylentės')
    .replace(/\bdecking\b/gi, 'terasinės lentos')
    .replace(/\bpanels?\b/gi, 'plokštės');
}

interface Scaffold {
  /** Concise subject: no attention-tactic words (quick/short/question), no "?". */
  subject: (offer: string, category: string | null) => string;
  /** Greeting: a company name is never used as a recipient name. */
  greeting: (recipientName: string | null) => string;
  /** Natural personalization sentence from a normalized clause (or neutral). */
  personalization: (clause: string | null) => string;
  /** One clear product proposition; category is optional stored context. */
  proposition: (offer: string, category: string | null) => string;
  /** Restrained commercial-terms wording — never a price or superlative. */
  terms: string;
  /** Exactly one simple, low-friction call to action. */
  cta: string;
  closing: string;
}

const DEFAULT_SCAFFOLD: Scaffold = {
  subject: (offer, category) =>
    category ? `${offer} ${category}` : offer,
  greeting: (recipientName) => (recipientName ? `Hello ${recipientName},` : 'Hello,'),
  personalization: (clause) =>
    clause
      ? `I came across your company and noticed that ${clause}.`
      : 'I came across your company and thought our products might be relevant.',
  proposition: (offer, category) =>
    `We supply ${offer}${category ? ` (${category})` : ''} and would be glad to share more.`,
  terms:
    'We offer competitive B2B terms — current pricing depends on quantity and specification.',
  cta: 'Would this be relevant for your product range?',
  closing: 'Best regards,',
};

/**
 * Bounded, explicitly-curated Lithuanian renderings of generic category labels
 * for recipient-facing prose. Official product names are never translated; an
 * unknown category is omitted rather than guessed.
 */
const LT_CATEGORY: Record<string, string> = {
  cladding: 'dailylenčių',
  'sauna cladding': 'pirtinių dailylenčių',
  panels: 'plokščių',
  panel: 'plokštės',
  timber: 'medienos',
  wood: 'medienos',
  decking: 'terasinių lentų',
};


const SCAFFOLDS: Record<string, Scaffold> = {
  en: DEFAULT_SCAFFOLD,
  lt: {
    subject: (offer, category) =>
      `Dėl ${offer}${category ? ` ${category}` : ''}`,
    greeting: (recipientName) =>
      recipientName ? `Sveiki, ${recipientName},` : 'Sveiki,',
    personalization: (clause) =>
      clause
        ? `Radau jūsų įmonę ir pastebėjau, kad ${clause}.`
        : 'Radau jūsų įmonę ir norėčiau pasiteirauti dėl bendradarbiavimo.',
    proposition: (offer) =>
      `Siūlome ${offer} ir mielai pasidalytume daugiau informacijos.`,
    terms:
      'Siūlome konkurencingas B2B sąlygas — dabartinė kaina priklauso nuo kiekio ir specifikacijos.',
    cta: 'Ar tai būtų aktualu jūsų produktų asortimentui?',
    closing: 'Pagarbiai,',
  },
  lv: {
    subject: (offer) => `Par ${offer}`,
    greeting: (recipientName) =>
      recipientName ? `Labdien, ${recipientName}!` : 'Labdien,',
    personalization: () =>
      'Atradu jūsu uzņēmumu un vēlētos pajautāt par sadarbību.',
    proposition: (offer, category) =>
      `Mēs piegādājam ${offer}${category ? ` (${category})` : ''} un labprāt pastāstītu vairāk.`,
    terms:
      'Piedāvājam konkurētspējīgus B2B nosacījumus — pašreizējā cena ir atkarīga no apjoma un specifikācijas.',
    cta: 'Vai tas būtu noderīgi jūsu produktu klāstā?',
    closing: 'Ar cieņu,',
  },
  et: {
    subject: (offer) => offer,
    greeting: (recipientName) =>
      recipientName ? `Tere, ${recipientName}!` : 'Tere,',
    personalization: () =>
      'Leidsin teie ettevõtte ja sooviksin koostöö kohta küsida.',
    proposition: (offer, category) =>
      `Me tarnime ${offer}${category ? ` (${category})` : ''} ja jagame meelsasti lisateavet.`,
    terms:
      'Pakume konkurentsivõimelisi B2B tingimusi — praegune hind sõltub kogusest ja spetsifikatsioonist.',
    cta: 'Kas see võiks olla teie tootevalikus asjakohane?',
    closing: 'Lugupidamisega,',
  },
};

export interface SenderIdentity {
  senderName: string;
  /** Canonical role/title, passed through verbatim (never translated). */
  senderTitle: string | null;
  senderCompany: string | null;
  senderPhone: string | null;
  senderWebsite: string | null;
  senderEmail: string;
  /** Display metadata only — never a permission to send via WhatsApp. */
  whatsappEnabled: boolean;
  /** Optional dedicated WhatsApp number; falls back to `senderPhone`. */
  whatsappPhone: string | null;
  /** Logo appears in the HTML signature only when enabled and a URL exists. */
  includeLogoInSignature: boolean;
  logoUrl: string | null;
}

/**
 * Optional batch-level message strategy: shared overrides for the subject,
 * proposition, commercial-terms line and CTA. The evidence-backed personalization
 * (and the structured greeting/signature) are NEVER overridable here, so applying
 * a strategy preserves each lead's personalization.
 */
export interface MessageStrategy {
  subject?: string | null;
  proposition?: string | null;
  terms?: string | null;
  cta?: string | null;
}

export interface DraftContentInput extends SenderIdentity {
  language: string;
  /** Recipient company (context only; never used as a person's name). */
  companyName: string;
  /** A real named contact person, when known — else null. */
  recipientName: string | null;
  /** Evidence-backed observation about the company (stored on the lead). */
  observedActivityText: string;
  /** Observed business roles (stored on the lead) — drive structured rendering. */
  observedRoles: string[];
  /** Our sellable offer name (research context). */
  offerSummary: string;
  /** Optional stored product category (research context); never invented. */
  productCategory: string | null;
  /** Optional shared batch-level message overrides. */
  strategy?: MessageStrategy;
}

export interface DraftContent {
  subject: string;
  /** Editable message body WITHOUT the closing/signature (the canonical body). */
  canonicalBody: string;
  /** Plain-text send body: canonical body + closing + structured signature. */
  body: string;
  /** HTML send body derived from `canonicalBody` + signature (+ optional logo). */
  htmlBody: string;
}

/**
 * Includes the stored category only when it is not already represented in the
 * offer wording, so we never produce "Thermo Abachi STD cladding (cladding)".
 */
export function shouldIncludeCategory(
  offer: string,
  category: string | null,
): boolean {
  const value = category?.trim();
  if (!value) return false;
  return !offer.toLowerCase().includes(value.toLowerCase());
}

/**
 * The category used in the subject line, localized for recipient-facing prose
 * where a curated rendering exists. Unknown categories are omitted (never
 * guessed, never a leaked internal English label).
 */
function localizeSubjectCategory(
  language: string,
  offer: string,
  category: string | null,
): string | null {
  if (!category) return null;
  const key = category.trim().toLowerCase();
  if (language === 'en') {
    return shouldIncludeCategory(offer, category) ? category.trim() : null;
  }
  if (language === 'lt') {
    const lt = LT_CATEGORY[key];
    if (!lt) return null;
    // Omit the category when the (already localized) offer carries the term.
    const stem = lt.slice(0, 6).toLowerCase();
    return offer.toLowerCase().includes(stem) ? null : lt;
  }
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] as string,
  );
}

function closingPhrase(language: string): string {
  return (SCAFFOLDS[language] ?? DEFAULT_SCAFFOLD).closing;
}

function signatureLines(identity: SenderIdentity): string[] {
  const lines: string[] = [identity.senderName];
  if (identity.senderTitle) lines.push(identity.senderTitle);
  if (identity.senderCompany && identity.senderCompany !== identity.senderName) {
    lines.push(identity.senderCompany);
  }
  const whatsappNumber = identity.whatsappEnabled
    ? resolveWhatsapp(identity.senderPhone, identity.whatsappPhone)
    : null;
  if (whatsappNumber && whatsappNumber === identity.senderPhone) {
    lines.push(`${whatsappNumber} · WhatsApp`);
  } else {
    if (identity.senderPhone) lines.push(identity.senderPhone);
    if (whatsappNumber) lines.push(`${whatsappNumber} · WhatsApp`);
  }
  if (identity.senderWebsite) lines.push(identity.senderWebsite);
  lines.push(identity.senderEmail);
  return lines;
}

function resolveWhatsapp(
  phone: string | null,
  whatsappPhone: string | null,
): string | null {
  const dedicated = whatsappPhone?.trim();
  if (dedicated) return dedicated;
  const main = phone?.trim();
  return main ? main : null;
}

function logoHtml(identity: SenderIdentity): string {
  if (!identity.includeLogoInSignature || !identity.logoUrl) return '';
  const alt = identity.senderCompany ?? identity.senderName;
  return `<p><img src="${escapeHtml(identity.logoUrl)}" alt="${escapeHtml(
    alt,
  )}" width="120" style="max-width:120px;height:auto;" /></p>\n`;
}

/**
 * Derives the sendable plain-text and HTML bodies from the canonical body plus
 * the structured sender identity/branding. This is the single derivation used at
 * generation AND whenever a human edits the canonical body, so the two can never
 * drift apart.
 */
export function composeOutreachBodies(
  language: string,
  canonicalBody: string,
  identity: SenderIdentity,
): { body: string; htmlBody: string } {
  const closing = closingPhrase(language);
  const lines = signatureLines(identity);
  const body =
    canonicalBody.trim() + '\n\n' + closing + '\n' + lines.join('\n');

  const paragraphs = canonicalBody
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.replace(/\n/g, ' '))}</p>`)
    .join('\n');
  const signatureHtml =
    `<p>${escapeHtml(closing)}</p>\n` +
    `<div>${lines.map(escapeHtml).join('<br />\n')}</div>`;
  const htmlBody = `${paragraphs}\n${logoHtml(identity)}${signatureHtml}`;
  return { body, htmlBody };
}

/**
 * Builds the first-contact draft content. The closing/signature are never part of
 * the canonical body (they are structured and derived); a free-text stored
 * signature is deliberately not read, and `senderTitle` is emitted verbatim.
 */
export function buildDraftContent(input: DraftContentInput): DraftContent {
  const scaffold = SCAFFOLDS[input.language] ?? DEFAULT_SCAFFOLD;
  // Single-language rule: LT uses the bounded structured renderer (never raw
  // English evidence); EN uses the English naturalizer; anything else falls back
  // to the scaffold's neutral sentence.
  const clause =
    input.language === 'lt'
      ? renderLtObservation(input.observedRoles, input.observedActivityText)
      : naturalizeObservation(input.observedActivityText, input.language);
  // Generic category tokens in a stored offer name are localized for LT prose
  // ("Thermo Abachi Cladding" → "Thermo Abachi dailylentės"); brand identity is
  // preserved.
  const offer =
    input.language === 'lt'
      ? localizeOfferForLt(input.offerSummary)
      : input.offerSummary;
  // The stored product category is an internal (often English) label: only the
  // English scaffold surfaces it, and only when it adds information beyond the
  // offer wording (no "… cladding (cladding)" and no leaked label in LT prose).
  const category =
    input.language === 'en' &&
    shouldIncludeCategory(offer, input.productCategory)
      ? input.productCategory!.trim()
      : null;
  const subjectCategory = localizeSubjectCategory(
    input.language,
    offer,
    input.productCategory,
  );

  // Batch-level strategy overrides the shared fields only; the evidence-backed
  // personalization sentence stays per-lead.
  const strategy = input.strategy ?? {};
  const subject =
    strategy.subject?.trim() || scaffold.subject(offer, subjectCategory);
  const proposition =
    strategy.proposition?.trim() || scaffold.proposition(offer, category);
  const terms = strategy.terms?.trim() || scaffold.terms;
  const cta = strategy.cta?.trim() || scaffold.cta;

  const canonicalBody = [
    scaffold.greeting(input.recipientName),
    '',
    `${scaffold.personalization(clause)} ${proposition}`,
    '',
    `${terms} ${cta}`,
  ].join('\n');

  const { body, htmlBody } = composeOutreachBodies(
    input.language,
    canonicalBody,
    input,
  );
  return {
    subject,
    canonicalBody,
    body,
    htmlBody,
  };
}

/** True when the language has a localized scaffold; else English scaffolding. */
export function hasScaffold(language: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCAFFOLDS, language);
}
