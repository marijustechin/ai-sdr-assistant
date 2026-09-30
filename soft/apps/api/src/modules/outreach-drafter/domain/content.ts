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

function stripLeadingArticle(value: string): string {
  return value.replace(/^(a|an|the)\s+/i, '');
}

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
 * Deterministically converts a stored observation into a natural recipient-facing
 * clause in the message language for the bounded set of supported patterns
 * (`sells …` → “you sell …” / “prekiaujate …”). Returns null when it cannot be
 * rendered safely — the caller then uses a neutral, evidence-safe fallback rather
 * than exposing raw database phrasing or an unsafe transformation. No
 * unrestricted machine translation is performed.
 */
export function naturalizeObservation(
  observed: string,
  language: string = 'en',
): string | null {
  if (language !== 'en' && language !== 'lt') return null;
  const lang: RewriteLanguage = language;
  const text = observed.trim().replace(/\s+/g, ' ').replace(/[.;]+$/, '');
  if (!text) return null;

  const companyIs = /^the company\s+(is|are)\s+(.+)$/i.exec(text);
  if (companyIs) {
    const rest = companyIs[2]!;
    if (lang === 'en') return `you are ${rest}`;
    return `esate ${stripLeadingArticle(rest)}`;
  }
  const company = /^the company\s+(.+)$/i.exec(text);
  if (company) {
    const clause = clauseFromRest(company[1]!, lang);
    if (clause) return clause;
    return lang === 'en' ? `it ${company[1]}` : null;
  }
  return clauseFromRest(text, lang);
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
  if (!category || !shouldIncludeCategory(offer, category)) return null;
  const key = category.trim().toLowerCase();
  if (language === 'en') return category.trim();
  if (language === 'lt') return LT_CATEGORY[key] ?? null;
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
  const clause = naturalizeObservation(input.observedActivityText, input.language);
  // The stored product category is an internal (often English) label: only the
  // English scaffold surfaces it, and only when it adds information beyond the
  // offer wording (no "… cladding (cladding)" and no leaked label in LT prose).
  const category =
    input.language === 'en' &&
    shouldIncludeCategory(input.offerSummary, input.productCategory)
      ? input.productCategory!.trim()
      : null;
  const subjectCategory = localizeSubjectCategory(
    input.language,
    input.offerSummary,
    input.productCategory,
  );

  // Batch-level strategy overrides the shared fields only; the evidence-backed
  // personalization sentence stays per-lead.
  const strategy = input.strategy ?? {};
  const subject =
    strategy.subject?.trim() || scaffold.subject(input.offerSummary, subjectCategory);
  const proposition =
    strategy.proposition?.trim() ||
    scaffold.proposition(input.offerSummary, category);
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
