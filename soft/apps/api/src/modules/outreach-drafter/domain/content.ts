/**
 * Generic draft content builder.
 *
 * Deliberately product-independent: it interpolates context/evidence strings
 * (offer, observed activity, sender) into a small localized scaffold and adds no
 * commercial claim of its own — no prices, stock, certifications, delivery
 * promises, or prior relationships. Exactly one clear question.
 */

import { resolveWhatsAppPhone } from '@ai-sdr/contracts';

interface Scaffold {
  subject: (offer: string) => string;
  greeting: (company: string) => string;
  observation: (observed: string) => string;
  question: (offer: string) => string;
  closing: string;
}

const DEFAULT_SCAFFOLD: Scaffold = {
  subject: (offer) => `A quick question about ${offer}`,
  greeting: (company) => `Hello ${company} team,`,
  observation: (observed) => `I came across your work — ${observed}`,
  question: (offer) => `Would it be useful to have a short chat about ${offer}?`,
  closing: 'Best regards,',
};

const SCAFFOLDS: Record<string, Scaffold> = {
  en: DEFAULT_SCAFFOLD,
  lt: {
    subject: (offer) => `Trumpas klausimas apie ${offer}`,
    greeting: (company) => `Sveiki, ${company},`,
    observation: (observed) => `Radau jūsų veiklą — ${observed}`,
    question: (offer) => `Ar vertėtų trumpai pasikalbėti apie ${offer}?`,
    closing: 'Pagarbiai,',
  },
  lv: {
    subject: (offer) => `Īss jautājums par ${offer}`,
    greeting: (company) => `Labdien, ${company}!`,
    observation: (observed) => `Iepazinu jūsu darbību — ${observed}`,
    question: (offer) => `Vai būtu lietderīgi īsi parunāt par ${offer}?`,
    closing: 'Ar cieņu,',
  },
  et: {
    subject: (offer) => `Lühike küsimus: ${offer}`,
    greeting: (company) => `Tere, ${company}!`,
    observation: (observed) => `Märkasin teie tegevust — ${observed}`,
    question: (offer) => `Kas oleks kasulik lühidalt rääkida ${offer}?`,
    closing: 'Lugupidamisega,',
  },
};

export interface DraftContentInput {
  language: string;
  companyName: string;
  observedActivityText: string;
  offerSummary: string;
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

export interface DraftContent {
  subject: string;
  /** Plain-text body. Never contains image/logo markup. */
  body: string;
  /** HTML body (same content plus an HTML signature). Never trusted as input. */
  htmlBody: string;
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

/**
 * Builds the plain-text and HTML bodies. The closing phrase comes from the
 * message-language scaffold; the signature block is composed ONLY from
 * structured sender fields (name, canonical title, company, phone/WhatsApp,
 * website, email) that are never invented or translated. A free-text stored
 * signature is deliberately not read.
 *
 * The plain-text body never contains the logo. The HTML signature may include a
 * small logo only when explicitly enabled and a URL is configured; the contact
 * details remain real text, so a missing/broken image never makes the signature
 * unusable. Title localization is intentionally NOT applied: `senderTitle` is
 * free text, so it is emitted verbatim.
 */
export function buildDraftContent(input: DraftContentInput): DraftContent {
  const scaffold = SCAFFOLDS[input.language] ?? DEFAULT_SCAFFOLD;
  const signatureLines: string[] = [input.senderName];
  if (input.senderTitle) signatureLines.push(input.senderTitle);
  if (input.senderCompany && input.senderCompany !== input.senderName) {
    signatureLines.push(input.senderCompany);
  }

  // Phone line(s): append a WhatsApp marker when the sender is reachable on
  // WhatsApp. A dedicated number falls back to the main phone; when it differs,
  // both are preserved. Neither is invented. Display metadata only — not
  // permission to send.
  const whatsappNumber = input.whatsappEnabled
    ? resolveWhatsAppPhone(input.senderPhone, input.whatsappPhone)
    : null;
  if (whatsappNumber && whatsappNumber === input.senderPhone) {
    signatureLines.push(`${whatsappNumber} · WhatsApp`);
  } else {
    if (input.senderPhone) signatureLines.push(input.senderPhone);
    if (whatsappNumber) signatureLines.push(`${whatsappNumber} · WhatsApp`);
  }

  if (input.senderWebsite) signatureLines.push(input.senderWebsite);
  signatureLines.push(input.senderEmail);

  const body = [
    scaffold.greeting(input.companyName),
    '',
    scaffold.observation(input.observedActivityText),
    '',
    scaffold.question(input.offerSummary),
    '',
    scaffold.closing,
    ...signatureLines,
  ].join('\n');

  const paragraphs = [
    scaffold.greeting(input.companyName),
    scaffold.observation(input.observedActivityText),
    scaffold.question(input.offerSummary),
  ].map((line) => `<p>${escapeHtml(line)}</p>`);
  const logo =
    input.includeLogoInSignature && input.logoUrl
      ? `<p><img src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(
          input.senderCompany ?? input.senderName,
        )}" width="120" style="max-width:120px;height:auto;" /></p>\n`
      : '';
  const signatureHtml =
    `<p>${escapeHtml(scaffold.closing)}</p>\n` +
    `<div>${signatureLines.map(escapeHtml).join('<br />\n')}</div>`;
  const htmlBody =
    paragraphs.join('\n') + '\n' + logo + signatureHtml;

  return { subject: scaffold.subject(input.offerSummary), body, htmlBody };
}

/** True when the language has a localized scaffold; else English scaffolding. */
export function hasScaffold(language: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCAFFOLDS, language);
}
