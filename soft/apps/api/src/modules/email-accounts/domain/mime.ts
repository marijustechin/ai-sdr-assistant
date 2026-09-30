/**
 * Deterministic raw-MIME builder for outreach sends.
 *
 * The same serialized message is used for both SMTP submission and the IMAP Sent
 * append, so the Sent copy preserves the exact MIME structure, Message-ID, and
 * bodies. Bodies are base64-encoded (safe for UTF-8 and folding); raw bodies are
 * never regenerated downstream.
 */

export interface RawMimeSpec {
  fromName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  to: string;
  subject: string;
  text: string;
  /** When null, a plain-text-only message is built. */
  html: string | null;
  /** The Message-ID we require the server to use; wrapped in <> if needed. */
  messageId: string;
  date: Date;
  /**
   * Optional extra headers (insertion order preserved), e.g. non-visible
   * diagnostic headers on a controlled test copy. Values are stripped of CR/LF
   * so they can never inject a header.
   */
  headers?: Record<string, string>;
}

function isAscii(value: string): boolean {
  return /^[\x20-\x7e]*$/.test(value);
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string): string {
  if (isAscii(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function formatFrom(name: string | null, email: string): string {
  if (!name) return email;
  return `${encodeHeader(name)} <${email}>`;
}

function ensureAngles(messageId: string): string {
  return messageId.startsWith('<') ? messageId : `<${messageId}>`;
}

function wrapBase64(value: string): string {
  const base64 = Buffer.from(value, 'utf8').toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 76) {
    lines.push(base64.slice(i, i + 76));
  }
  return lines.join('\r\n');
}

/** Deterministic boundary derived from the Message-ID (no randomness). */
function boundaryFor(messageId: string): string {
  const token = Buffer.from(messageId, 'utf8').toString('hex').slice(0, 24);
  return `=_ai_sdr_${token}`;
}

export function buildRawMime(spec: RawMimeSpec): Buffer {
  const extraHeaders = Object.entries(spec.headers ?? {}).map(
    ([name, value]) => `${name}: ${sanitizeHeaderValue(value)}`,
  );
  const headers = [
    `Date: ${spec.date.toUTCString()}`,
    `From: ${formatFrom(spec.fromName, spec.fromEmail)}`,
    `To: ${spec.to}`,
    ...(spec.replyToEmail ? [`Reply-To: ${spec.replyToEmail}`] : []),
    `Subject: ${encodeHeader(spec.subject)}`,
    `Message-ID: ${ensureAngles(spec.messageId)}`,
    'MIME-Version: 1.0',
    ...extraHeaders,
  ];

  if (!spec.html) {
    headers.push(
      'Content-Type: text/plain; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
    );
    return Buffer.from(
      [...headers, '', wrapBase64(spec.text)].join('\r\n'),
      'utf8',
    );
  }

  const boundary = boundaryFor(spec.messageId);
  headers.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  );
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(spec.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(spec.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return Buffer.from([...headers, '', body].join('\r\n'), 'utf8');
}

/** Common Sent folder names used only when IMAP special-use is unavailable. */
export const SENT_FOLDER_FALLBACKS = [
  'Sent',
  'Sent Items',
  'Sent Messages',
  'INBOX.Sent',
  '[Gmail]/Sent Mail',
];

export interface MailboxDescriptor {
  path: string;
  specialUse: string | null;
}

/**
 * Discovers the Sent mailbox via IMAP special-use (`\Sent`) first, then a bounded
 * set of common names. Returns null when none is found (the caller must not
 * assume a fixed folder name).
 */
export function selectSentMailbox(
  mailboxes: MailboxDescriptor[],
  fallbacks: string[] = SENT_FOLDER_FALLBACKS,
): string | null {
  const bySpecialUse = mailboxes.find(
    (mailbox) => (mailbox.specialUse ?? '').toLowerCase() === '\\sent',
  );
  if (bySpecialUse) return bySpecialUse.path;
  for (const name of fallbacks) {
    const match = mailboxes.find(
      (mailbox) => mailbox.path.toLowerCase() === name.toLowerCase(),
    );
    if (match) return match.path;
  }
  return null;
}
