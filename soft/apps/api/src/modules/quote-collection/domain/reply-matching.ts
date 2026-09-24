import { normalizeMessageId } from './message-id.js';

/**
 * Correlate a supplier reply to an outbound RFQ. Standards-based header
 * matching (`In-Reply-To` / `References` against our Message-ID) is preferred.
 * A bounded fallback (sender relationship + normalized subject + a sent-time
 * window) is used only when headers are unavailable, and only when it yields
 * exactly one candidate. Ambiguous replies are left unmatched for human review.
 */

export interface OutboundRef {
  id: string;
  messageId: string;
  recipientEmail: string;
  subject: string;
  sentAt: Date;
}

export interface InboundRef {
  /** The inbound message's own Message-ID (used to exclude outgoing copies). */
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  subject: string | null;
  receivedAt: Date | null;
}

export type ReplyMatch =
  | { kind: 'header'; outboundId: string }
  | { kind: 'fallback'; outboundId: string }
  | { kind: 'none' }
  | { kind: 'ambiguous' };

export interface MatchOptions {
  /** A fallback reply must arrive no earlier than this slack before the send. */
  sentSlackMs?: number;
  /** A fallback reply must arrive within this window after the send. */
  windowMs?: number;
}

const DEFAULT_SENT_SLACK_MS = 5 * 60 * 1000;
const DEFAULT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

/** Strips repeated localized reply/forward prefixes and normalizes whitespace. */
export function normalizeSubject(subject: string | null | undefined): string {
  if (typeof subject !== 'string') return '';
  let value = subject.trim();
  // Common English + localized reply/forward markers (e.g. "Re:", "Fwd:",
  // "AW:", "Ats.:" (lt), "Antw:" (de), "Odp:" (pl), "R:" (it), "VS:" (fi)).
  let previous = '';
  while (previous !== value) {
    previous = value;
    value = value.replace(
      /^\s*(re|fwd|fw|aw|sv|vs|antw|odp|rif|ats|atb|tr|enc|res|r|w|wg)\.?\s*:\s*/i,
      '',
    );
  }
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** True when an inbound message is a copy of one of our outbound messages. */
export function isOutgoingCopy(
  inbound: InboundRef,
  outbounds: OutboundRef[],
): boolean {
  const inboundId = normalizeMessageId(inbound.providerMessageId);
  if (!inboundId) return false;
  return outbounds.some(
    (outbound) => normalizeMessageId(outbound.messageId) === inboundId,
  );
}

export function matchReply(
  inbound: InboundRef,
  outbounds: OutboundRef[],
  options: MatchOptions = {},
): ReplyMatch {
  const sentSlackMs = options.sentSlackMs ?? DEFAULT_SENT_SLACK_MS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  // An incoming copy of our own outbound message is not a reply.
  if (isOutgoingCopy(inbound, outbounds)) {
    return { kind: 'none' };
  }

  // 1) Header-based correlation (preferred, standards-based).
  const headerHits = new Set<string>();
  const inReplyTo = normalizeMessageId(inbound.inReplyTo);
  if (inReplyTo) {
    for (const outbound of outbounds) {
      if (normalizeMessageId(outbound.messageId) === inReplyTo) {
        headerHits.add(outbound.id);
      }
    }
  }
  const referenceIds = inbound.references
    .map((reference) => normalizeMessageId(reference))
    .filter((value): value is string => value !== null);
  if (referenceIds.length > 0) {
    for (const outbound of outbounds) {
      const normalized = normalizeMessageId(outbound.messageId);
      if (normalized && referenceIds.includes(normalized)) {
        headerHits.add(outbound.id);
      }
    }
  }
  if (headerHits.size === 1) {
    return { kind: 'header', outboundId: [...headerHits][0] as string };
  }
  if (headerHits.size > 1) {
    return { kind: 'ambiguous' };
  }

  // 2) Bounded fallback — only when headers yielded nothing. Never subject alone.
  const from = inbound.fromEmail?.trim().toLowerCase() ?? null;
  const subject = normalizeSubject(inbound.subject);
  if (!from || !subject || !inbound.receivedAt) {
    return { kind: 'none' };
  }
  const receivedMs = inbound.receivedAt.getTime();
  const candidates = outbounds.filter((outbound) => {
    if (outbound.recipientEmail.trim().toLowerCase() !== from) return false;
    if (normalizeSubject(outbound.subject) !== subject) return false;
    const sentMs = outbound.sentAt.getTime();
    return (
      receivedMs >= sentMs - sentSlackMs && receivedMs <= sentMs + windowMs
    );
  });
  if (candidates.length === 1) {
    return { kind: 'fallback', outboundId: candidates[0]!.id };
  }
  if (candidates.length > 1) {
    return { kind: 'ambiguous' };
  }
  return { kind: 'none' };
}
