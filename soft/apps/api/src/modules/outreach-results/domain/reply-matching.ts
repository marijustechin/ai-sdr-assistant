import type { OutboundRef } from './types.js';

/**
 * Correlates an inbound reply to a sent outreach message. Standards-based header
 * matching (`In-Reply-To` / `References` vs our Message-ID) is preferred; a
 * bounded fallback (same sender + normalized subject + time window) is used only
 * when headers yield nothing and only when it resolves to exactly one candidate.
 * Ambiguous replies are left unmatched for human review.
 */

export interface InboundRef {
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

const SENT_SLACK_MS = 5 * 60 * 1000;
const WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

/** Comparison form of a Message-ID (trimmed, no angle brackets, lower-cased). */
export function normalizeMessageId(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^<+/, '').replace(/>+$/, '').trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
}

/** Strips repeated localized reply/forward prefixes and normalizes whitespace. */
export function normalizeSubject(subject: string | null | undefined): string {
  if (typeof subject !== 'string') return '';
  let value = subject.trim();
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

function isOutgoingCopy(inbound: InboundRef, outbounds: OutboundRef[]): boolean {
  const inboundId = normalizeMessageId(inbound.providerMessageId);
  if (!inboundId) return false;
  return outbounds.some(
    (outbound) => normalizeMessageId(outbound.messageId) === inboundId,
  );
}

export function matchReply(
  inbound: InboundRef,
  outbounds: OutboundRef[],
): ReplyMatch {
  if (isOutgoingCopy(inbound, outbounds)) return { kind: 'none' };

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
    .map(normalizeMessageId)
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
  if (headerHits.size > 1) return { kind: 'ambiguous' };

  const from = inbound.fromEmail?.trim().toLowerCase() ?? null;
  const subject = normalizeSubject(inbound.subject);
  if (!from || !subject || !inbound.receivedAt) return { kind: 'none' };
  const receivedMs = inbound.receivedAt.getTime();
  const candidates = outbounds.filter((outbound) => {
    if (outbound.recipientEmail.trim().toLowerCase() !== from) return false;
    if (normalizeSubject(outbound.subject) !== subject) return false;
    const sentMs = outbound.sentAt.getTime();
    return receivedMs >= sentMs - SENT_SLACK_MS && receivedMs <= sentMs + WINDOW_MS;
  });
  if (candidates.length === 1) {
    return { kind: 'fallback', outboundId: candidates[0]!.id };
  }
  if (candidates.length > 1) return { kind: 'ambiguous' };
  return { kind: 'none' };
}
