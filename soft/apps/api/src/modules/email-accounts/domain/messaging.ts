/**
 * Provider-neutral ports for outbound (SMTP) and inbound (IMAP) mailbox
 * operations used by other modules (e.g. `quote-collection`). They are owned by
 * `email-accounts`, which is the only place that opens a mailbox connection and
 * the only place that decrypts a stored password. Callers pass an account id and
 * never touch credentials.
 *
 * Implementations are invoked only from an explicit human action; nothing here
 * schedules or runs automatically. Failures are raised as `MailTransportError`
 * carrying a short, safe machine code — never a raw provider response, a
 * password, or a ciphertext.
 */

/** A single outbound message to submit. Contains no credentials. */
export interface OutboundMailSpec {
  fromName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  to: string;
  subject: string;
  text: string;
  /** The Message-ID we generated and require the server to use verbatim. */
  messageId: string;
}

export interface OutboundMailResult {
  /** The Message-ID actually used (preserved from the spec). */
  messageId: string;
  /** Server-accepted identifier, when the transport reports one. */
  providerMessageId: string | null;
}

/** Bounded reply-scan window (recent messages only). */
export interface ReplyScanWindow {
  sinceDays: number;
  limit: number;
}

/** One bounded inbound reply candidate (headers + minimal text body). */
export interface InboundMailCandidate {
  /** Stable mailbox identity `${uidValidity}:${uid}` — the idempotency key. */
  mailboxUid: string;
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  receivedAt: Date | null;
  text: string;
}

/** Typed, redacted transport failure (short safe code only). */
export class MailTransportError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'MailTransportError';
  }
}

export abstract class OutboundMailPort {
  abstract send(
    accountId: string,
    spec: OutboundMailSpec,
  ): Promise<OutboundMailResult>;
}

export abstract class InboundMailPort {
  abstract scanRecent(
    accountId: string,
    window: ReplyScanWindow,
  ): Promise<InboundMailCandidate[]>;
}
