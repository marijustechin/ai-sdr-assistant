import { describe, it, expect } from 'vitest';
import {
  collectTextParts,
  decodeTextPart,
  pickTextPart,
  sanitizeHtmlToText,
  type BodyStructureNode,
} from '../src/modules/email-accounts/domain/imap-body.js';

/** The shape observed live: multipart/alternative with text + html parts. */
const MULTIPART_ALTERNATIVE: BodyStructureNode = {
  type: 'multipart/alternative',
  childNodes: [
    { part: '1', type: 'text/plain', encoding: 'quoted-printable' },
    { part: '2', type: 'text/html', encoding: 'quoted-printable' },
  ],
};

describe('imap body structure selection', () => {
  it('selects the text/plain part of a multipart/alternative message', () => {
    const parts = collectTextParts(MULTIPART_ALTERNATIVE);
    expect(parts).toEqual([
      { path: '1', encoding: 'quoted-printable', kind: 'plain' },
      { path: '2', encoding: 'quoted-printable', kind: 'html' },
    ]);
    expect(pickTextPart(parts)?.path).toBe('1');
  });

  it('finds the text/plain part inside multipart/mixed and skips attachments', () => {
    const mixed: BodyStructureNode = {
      type: 'multipart/mixed',
      childNodes: [
        {
          type: 'multipart/alternative',
          childNodes: [
            { part: '1.1', type: 'text/plain', encoding: '7bit' },
            { part: '1.2', type: 'text/html', encoding: '7bit' },
          ],
        },
        {
          part: '2',
          type: 'application/pdf',
          encoding: 'base64',
          disposition: 'attachment',
        },
      ],
    };
    const parts = collectTextParts(mixed);
    expect(parts.map((part) => part.path)).toEqual(['1.1', '1.2']);
    expect(pickTextPart(parts)?.path).toBe('1.1');
  });

  it('falls back to the html part when there is no text/plain part', () => {
    const htmlOnly: BodyStructureNode = {
      type: 'multipart/alternative',
      childNodes: [{ part: '1', type: 'text/html', encoding: '7bit' }],
    };
    const picked = pickTextPart(collectTextParts(htmlOnly));
    expect(picked).toEqual({ path: '1', encoding: '7bit', kind: 'html' });
  });

  it('treats a non-multipart text message as part 1', () => {
    const single: BodyStructureNode = {
      type: 'text/plain',
      encoding: 'quoted-printable',
    };
    expect(pickTextPart(collectTextParts(single))).toEqual({
      path: '1',
      encoding: 'quoted-printable',
      kind: 'plain',
    });
  });

  it('never selects an attachment-only message body', () => {
    const attachmentOnly: BodyStructureNode = {
      type: 'application/pdf',
      disposition: 'attachment',
    };
    expect(pickTextPart(collectTextParts(attachmentOnly))).toBeNull();
  });
});

describe('imap body decoding', () => {
  it('decodes quoted-printable text', () => {
    const raw = Buffer.from('Price =E2=82=AC10 per m=3D3'.replace(/=\n/g, ''), 'binary');
    expect(decodeTextPart(raw, 'quoted-printable')).toContain('10');
    expect(decodeTextPart(Buffer.from('a=3Db', 'binary'), 'quoted-printable')).toBe(
      'a=b',
    );
  });

  it('decodes base64 text', () => {
    const raw = Buffer.from('1200 EUR per m3', 'utf8').toString('base64');
    expect(decodeTextPart(Buffer.from(raw, 'ascii'), 'base64')).toBe(
      '1200 EUR per m3',
    );
  });

  it('returns empty for undecodable content instead of fabricating text', () => {
    expect(decodeTextPart(Buffer.alloc(0), 'base64')).toBe('');
  });
});

describe('html sanitization', () => {
  it('converts html to bounded plain text without scripts', () => {
    const html =
      '<html><head><style>.x{}</style></head><body><p>Our price is ' +
      '<b>1200 EUR</b> per m3.</p><script>alert(1)</script><br>MOQ 25 m3.' +
      '</body></html>';
    const text = sanitizeHtmlToText(html, 10_000);
    expect(text).toContain('1200 EUR');
    expect(text).toContain('MOQ 25 m3.');
    expect(text).not.toContain('<');
    expect(text).not.toContain('alert');
  });

  it('is bounded', () => {
    const text = sanitizeHtmlToText('x'.repeat(1000), 10);
    expect(text.length).toBe(10);
  });

  it('returns empty for an empty body', () => {
    expect(sanitizeHtmlToText('', 100)).toBe('');
  });
});
