/**
 * Pure helpers for extracting the text body of an inbound message from a
 * BODYSTRUCTURE and fetched MIME parts.
 *
 * The live mailbox (a standard hosted IMAP server) returns a `multipart/*`
 * body structure; the reliable way to read the text is to fetch the concrete
 * MIME part(s) by their part number from `BODYSTRUCTURE` — a plain
 * `BODY[TEXT]` request did not return content on that provider. Attachments are
 * never fetched. An HTML-only message is converted to bounded plain text; an
 * empty message yields an empty string — text is never fabricated.
 */

export interface BodyStructureNode {
  /** IMAP part number (e.g. "1", "1.1"); absent on a non-multipart root. */
  part?: string;
  /** Content-Type, e.g. `text/plain`, `text/html`, `multipart/alternative`. */
  type?: string;
  /** Content-Disposition (`attachment` marks a part we must not fetch). */
  disposition?: string;
  /** Content-Transfer-Encoding of a leaf part. */
  encoding?: string;
  childNodes?: BodyStructureNode[];
}

export interface TextPartCandidate {
  path: string;
  encoding: string;
  kind: 'plain' | 'html';
}

/** Walks the structure, returning text/plain and text/html leaf parts. */
export function collectTextParts(
  root: BodyStructureNode | undefined | null,
): TextPartCandidate[] {
  const parts: TextPartCandidate[] = [];
  const walk = (node: BodyStructureNode | undefined | null): void => {
    if (!node) return;
    const type = (node.type ?? '').toLowerCase();
    // Never descend into an embedded message or an attachment.
    if (type.startsWith('message/')) return;
    if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
      for (const child of node.childNodes) walk(child);
      return;
    }
    const disposition = (node.disposition ?? '').toLowerCase();
    if (disposition === 'attachment') return;
    const encoding = (node.encoding ?? '').toLowerCase() || '7bit';
    if (type === 'text/plain') {
      parts.push({ path: node.part ?? '1', encoding, kind: 'plain' });
    } else if (type === 'text/html') {
      parts.push({ path: node.part ?? '1', encoding, kind: 'html' });
    }
  };
  walk(root);
  return parts;
}

/**
 * Chooses the body part to use: the first `text/plain` part, else the first
 * `text/html` part. Returns null when the message has no usable text part.
 */
export function pickTextPart(
  parts: TextPartCandidate[],
): TextPartCandidate | null {
  return parts.find((part) => part.kind === 'plain') ?? parts[0] ?? null;
}

/** Decodes a fetched part body according to its transfer encoding. */
export function decodeTextPart(buffer: Buffer, encoding: string): string {
  const normalized = (encoding || '').toLowerCase();
  if (normalized === 'base64') {
    const compact = buffer.toString('ascii').replace(/\s+/g, '');
    try {
      return Buffer.from(compact, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }
  if (normalized === 'quoted-printable') {
    return decodeQuotedPrintable(buffer.toString('binary'));
  }
  return buffer.toString('utf8');
}

function decodeQuotedPrintable(input: string): string {
  const withoutSoftBreaks = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
    const char = withoutSoftBreaks[index]!;
    if (char === '=') {
      const hex = withoutSoftBreaks.slice(index + 1, index + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        index += 2;
        continue;
      }
    }
    bytes.push(char.charCodeAt(0) & 0xff);
  }
  return Buffer.from(bytes).toString('utf8');
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/** Bounded, lossy HTML→text used only when no text/plain part exists. */
export function sanitizeHtmlToText(html: string, maxChars: number): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ');
  const withBreaks = withoutScripts
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|tr|li|h[1-6])\s*>/gi, '\n');
  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ');
  let text = withoutTags
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(
      /&[a-z#0-9]+;/gi,
      (entity) => ENTITIES[entity.toLowerCase()] ?? ' ',
    )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length > maxChars) text = text.slice(0, maxChars);
  return text;
}
