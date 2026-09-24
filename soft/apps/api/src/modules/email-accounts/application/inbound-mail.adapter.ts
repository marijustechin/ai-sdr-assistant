import { Inject, Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { decryptSecret } from '../../../security/secret-box.js';
import { buildImapClientOptions } from '../domain/mailbox-transport.js';
import { safeErrorCode } from '../domain/imap-diagnostics.js';
import {
  collectTextParts,
  decodeTextPart,
  pickTextPart,
  sanitizeHtmlToText,
  type BodyStructureNode,
  type TextPartCandidate,
} from '../domain/imap-body.js';
import {
  type InboundMailCandidate,
  InboundMailPort,
  MailTransportError,
  type ReplyScanWindow,
} from '../domain/messaging.js';
import { EmailAccountsRepository } from '../infrastructure/email-accounts.repository.js';

/** Minimal structural view of an ImapFlow fetch result (defensive). */
interface RawAddress {
  name?: string | null;
  address?: string | null;
}
interface RawEnvelope {
  date?: Date | null;
  subject?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  from?: RawAddress[] | null;
  to?: RawAddress[] | null;
}
interface RawMessage {
  uid?: number;
  envelope?: RawEnvelope | null;
  headers?: Buffer | Map<string, Buffer> | null;
  bodyStructure?: BodyStructureNode | null;
  bodyParts?: Map<string, Buffer> | null;
  internalDate?: Date | null;
}

interface Meta {
  uid: number;
  mailboxUid: string;
  envelope: RawEnvelope;
  headers: Buffer | Map<string, Buffer> | null | undefined;
  receivedAt: Date | null;
  candidate: TextPartCandidate | null;
}

/** Bounded connect ceiling for a reply scan. */
const CONNECT_TIMEOUT_MS = 15_000;
/** Per-part byte ceiling; the body is never fetched whole. */
const MAX_BODY_BYTES = 200_000;
/** Character ceiling after decoding/sanitizing. */
const MAX_BODY_CHARS = 100_000;

/**
 * IMAP implementation of `InboundMailPort` for a password-authenticated
 * mailbox. It opens INBOX read-only, searches a bounded recent window, inspects
 * each message's BODYSTRUCTURE, and fetches only the concrete `text/plain`
 * (else `text/html`) part by its part number — never attachments. Nothing is
 * deleted, moved, or marked read. The password is decrypted only inside this
 * method; failures are redacted to a short safe code.
 */
@Injectable()
export class ImapInboundMailAdapter extends InboundMailPort {
  constructor(
    @Inject(EmailAccountsRepository)
    private readonly repository: EmailAccountsRepository,
  ) {
    super();
  }

  async scanRecent(
    accountId: string,
    window: ReplyScanWindow,
  ): Promise<InboundMailCandidate[]> {
    const account = await this.repository.find(accountId);
    if (!account) throw new MailTransportError('email_account_not_found');
    if (account.status !== 'ACTIVE') {
      throw new MailTransportError('email_account_disabled');
    }
    if (!account.imapHost || account.imapPort === null) {
      throw new MailTransportError('imap_not_configured');
    }

    const secrets = await this.repository.findPasswordCiphertexts(accountId);
    const ciphertext = account.credentialsShared
      ? (secrets?.smtpPasswordCiphertext ?? null)
      : (secrets?.imapPasswordCiphertext ?? null);
    if (!ciphertext) {
      throw new MailTransportError('mailbox_credentials_missing');
    }
    let credential: string;
    try {
      credential = decryptSecret(ciphertext);
    } catch {
      throw new MailTransportError('secret_decryption_failed');
    }

    const options = buildImapClientOptions(account, { password: credential });
    const since = new Date(
      Date.now() - Math.max(1, window.sinceDays) * 86_400_000,
    );
    const limit = Math.min(Math.max(1, window.limit), 200);

    const client = new ImapFlow(
      options as unknown as ConstructorParameters<typeof ImapFlow>[0],
    );
    (client as unknown as { timeout?: number }).timeout = CONNECT_TIMEOUT_MS;

    try {
      await client.connect();
      // Read-only: reading INBOX must not change mailbox state.
      const lock = await client.getMailboxLock('INBOX', { readOnly: true });
      try {
        const uidValidity = String(
          (client.mailbox as { uidValidity?: bigint | number } | undefined)
            ?.uidValidity ?? 0,
        );
        const found = await client.search({ since }, { uid: true });
        const uids = Array.isArray(found) ? found.slice(-limit) : [];
        if (uids.length === 0) return [];

        const metas = await this.collectMeta(client, uids, uidValidity);
        const bodies = await this.fetchBodies(client, uids, metas);

        return metas.map((meta) => this.toCandidate(meta, bodies));
      } finally {
        lock.release();
      }
    } catch (error) {
      if (error instanceof MailTransportError) throw error;
      throw new MailTransportError(safeErrorCode(error));
    } finally {
      try {
        await client.logout();
      } catch {
        /* ignore close errors */
      }
    }
  }

  /** Pass 1: envelope + BODYSTRUCTURE per message (no body content). */
  private async collectMeta(
    client: ImapFlow,
    uids: number[],
    uidValidity: string,
  ): Promise<Meta[]> {
    const metas: Meta[] = [];
    for await (const raw of client.fetch(
      uids,
      {
        envelope: true,
        bodyStructure: true,
        internalDate: true,
        headers: ['references', 'in-reply-to'],
      },
      { uid: true },
    )) {
      const message = raw as unknown as RawMessage;
      const uid = typeof message.uid === 'number' ? message.uid : 0;
      const envelope = message.envelope ?? {};
      metas.push({
        uid,
        mailboxUid: `${uidValidity}:${uid}`,
        envelope,
        headers: message.headers,
        receivedAt: envelope.date ?? message.internalDate ?? null,
        candidate: pickTextPart(collectTextParts(message.bodyStructure)),
      });
    }
    return metas;
  }

  /** Pass 2: fetch only the chosen text parts (numeric part numbers). */
  private async fetchBodies(
    client: ImapFlow,
    uids: number[],
    metas: Meta[],
  ): Promise<Map<number, Map<string, Buffer>>> {
    const paths = [
      ...new Set(
        metas
          .map((meta) => meta.candidate?.path)
          .filter((path): path is string => Boolean(path)),
      ),
    ];
    const byUid = new Map<number, Map<string, Buffer>>();
    if (paths.length === 0) return byUid;
    for await (const raw of client.fetch(
      uids,
      {
        bodyParts: paths.map((path) => ({ key: path, maxLength: MAX_BODY_BYTES })),
      },
      { uid: true },
    )) {
      const message = raw as unknown as RawMessage;
      const uid = typeof message.uid === 'number' ? message.uid : 0;
      byUid.set(uid, message.bodyParts ?? new Map());
    }
    return byUid;
  }

  private toCandidate(
    meta: Meta,
    bodies: Map<number, Map<string, Buffer>>,
  ): InboundMailCandidate {
    const envelope = meta.envelope;
    return {
      mailboxUid: meta.mailboxUid,
      providerMessageId: envelope.messageId ?? null,
      inReplyTo: envelope.inReplyTo ?? null,
      references: this.readReferences(meta.headers),
      fromEmail: firstAddress(envelope.from),
      toEmail: firstAddress(envelope.to),
      subject: envelope.subject ?? null,
      receivedAt: meta.receivedAt,
      text: this.readText(meta, bodies),
    };
  }

  /** The decoded plain-text body; HTML-only is sanitized; empty stays empty. */
  private readText(
    meta: Meta,
    bodies: Map<number, Map<string, Buffer>>,
  ): string {
    const candidate = meta.candidate;
    if (!candidate) return '';
    const buffer = bodies.get(meta.uid)?.get(candidate.path);
    if (!buffer) return '';
    const decoded = decodeTextPart(buffer, candidate.encoding);
    const text =
      candidate.kind === 'html'
        ? sanitizeHtmlToText(decoded, MAX_BODY_CHARS)
        : decoded;
    return text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text;
  }

  private readReferences(
    headers: Buffer | Map<string, Buffer> | null | undefined,
  ): string[] {
    let raw: string | null = null;
    if (headers instanceof Map) {
      raw = headers.get('references')?.toString('utf8') ?? null;
    } else if (Buffer.isBuffer(headers)) {
      raw = headers.toString('utf8');
    }
    if (!raw) return [];
    const match = /references:\s*([\s\S]*?)(?:\r?\n[^ \t]|$)/i.exec(raw);
    const value = (match ? match[1] : raw) ?? '';
    return value
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  }
}

function firstAddress(list: RawAddress[] | null | undefined): string | null {
  if (!list || list.length === 0) return null;
  const first = list.find((entry) => entry.address);
  return first?.address ?? null;
}
