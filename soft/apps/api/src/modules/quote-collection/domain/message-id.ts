/**
 * Message-ID helpers for outbound RFQ messages and reply correlation.
 *
 * We generate the Message-ID and require the SMTP server to use it verbatim, so
 * a supplier reply's `In-Reply-To`/`References` headers can be correlated back
 * to the exact RFQ. Normalization is used only for comparison, never for
 * storage: the stored `messageId` is preserved as sent.
 */

/** Builds a Message-ID for a send, using the sender's domain. */
export function buildMessageId(fromEmail: string, uniqueId: string): string {
  const domain = fromEmail.split('@')[1]?.trim() || 'localhost';
  return `<${uniqueId}@${domain}>`;
}

/**
 * Comparison form of a Message-ID: trimmed, without surrounding angle brackets,
 * lower-cased. Returns null for empty/missing values.
 */
export function normalizeMessageId(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^<+/, '').replace(/>+$/, '').trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
}
