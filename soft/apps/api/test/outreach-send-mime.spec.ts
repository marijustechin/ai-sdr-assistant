import { describe, it, expect } from 'vitest';
import {
  buildRawMime,
  selectSentMailbox,
} from '../src/modules/email-accounts/domain/mime.js';

describe('raw MIME builder', () => {
  const spec = {
    fromName: 'Eimantas Doskus',
    fromEmail: 'eimantas@example.invalid',
    replyToEmail: 'sales@example.invalid',
    to: 'buyer@example.invalid',
    subject: 'A quick question about Thermo Abachi',
    text: 'Hello,\n\nPlain body.',
    html: '<p>Hello,</p>',
    messageId: '<abc@example.invalid>',
    date: new Date('2026-09-25T10:00:00.000Z'),
  };

  it('builds a multipart/alternative message with a stable Message-ID', () => {
    const raw = buildRawMime(spec).toString('utf8');
    expect(raw).toContain('Message-ID: <abc@example.invalid>');
    expect(raw).toContain('From: Eimantas Doskus <eimantas@example.invalid>');
    expect(raw).toContain('To: buyer@example.invalid');
    expect(raw).toContain('Reply-To: sales@example.invalid');
    expect(raw).toContain('MIME-Version: 1.0');
    expect(raw).toContain('Content-Type: multipart/alternative; boundary=');
    expect(raw).toContain('Content-Type: text/plain; charset="utf-8"');
    expect(raw).toContain('Content-Type: text/html; charset="utf-8"');
    // Bodies are base64-encoded.
    expect(raw).toContain(Buffer.from(spec.text, 'utf8').toString('base64'));
    expect(raw).toContain(Buffer.from(spec.html, 'utf8').toString('base64'));
  });

  it('is deterministic for the same input (same boundary and bytes)', () => {
    expect(buildRawMime(spec).equals(buildRawMime(spec))).toBe(true);
  });

  it('builds a plain-text-only message when html is null', () => {
    const raw = buildRawMime({ ...spec, html: null }).toString('utf8');
    expect(raw).toContain('Content-Type: text/plain; charset="utf-8"');
    expect(raw).not.toContain('multipart/alternative');
  });

  it('encodes non-ASCII headers as MIME words', () => {
    const raw = buildRawMime({ ...spec, subject: 'Dėl Abachi' }).toString('utf8');
    expect(raw).toContain('Subject: =?UTF-8?B?');
  });
});

describe('Sent mailbox discovery', () => {
  it('prefers IMAP special-use \\Sent', () => {
    const path = selectSentMailbox([
      { path: 'INBOX', specialUse: null },
      { path: 'Siųsti', specialUse: '\\Sent' },
      { path: 'Sent', specialUse: null },
    ]);
    expect(path).toBe('Siųsti');
  });

  it('falls back to common names only when special-use is absent', () => {
    expect(
      selectSentMailbox(
        [
          { path: 'INBOX', specialUse: null },
          { path: 'Sent Items', specialUse: null },
        ],
        ['Sent', 'Sent Items'],
      ),
    ).toBe('Sent Items');
  });

  it('returns null when no Sent mailbox is found (never assumes a fixed name)', () => {
    expect(
      selectSentMailbox([{ path: 'INBOX', specialUse: null }], ['Sent']),
    ).toBeNull();
  });
});
