/**
 * Generic draft content builder.
 *
 * Deliberately product-independent: it interpolates context/evidence strings
 * (offer, observed activity, sender) into a small localized scaffold and adds no
 * commercial claim of its own — no prices, stock, certifications, delivery
 * promises, or prior relationships. Exactly one clear question.
 */

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
  senderCompany: string | null;
  signature?: string;
}

export interface DraftContent {
  subject: string;
  body: string;
}

export function buildDraftContent(input: DraftContentInput): DraftContent {
  const scaffold = SCAFFOLDS[input.language] ?? DEFAULT_SCAFFOLD;
  const signatureLines: string[] = [input.senderName];
  if (input.senderCompany && input.senderCompany !== input.senderName) {
    signatureLines.push(input.senderCompany);
  }
  if (input.signature) {
    signatureLines.push('', input.signature);
  }
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
  return { subject: scaffold.subject(input.offerSummary), body };
}

/** True when the language has a localized scaffold; else English scaffolding. */
export function hasScaffold(language: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCAFFOLDS, language);
}
