import { describe, it, expect } from 'vitest';
import {
  isOutgoingCopy,
  matchReply,
  normalizeSubject,
  type OutboundRef,
} from '../src/modules/quote-collection/domain/reply-matching.js';

const SENT_AT = new Date('2026-09-24T10:00:00.000Z');

function outbound(overrides: Partial<OutboundRef> = {}): OutboundRef {
  return {
    id: 'ob1',
    messageId: '<abc@example.invalid>',
    recipientEmail: 'supplier@example.invalid',
    subject: 'Price inquiry: Abachi',
    sentAt: SENT_AT,
    ...overrides,
  };
}

function inbound(overrides: Partial<Parameters<typeof matchReply>[0]> = {}) {
  return {
    providerMessageId: '<reply@supplier.invalid>',
    inReplyTo: null as string | null,
    references: [] as string[],
    fromEmail: 'supplier@example.invalid' as string | null,
    subject: 'Re: Price inquiry: Abachi' as string | null,
    receivedAt: new Date('2026-09-24T11:00:00.000Z') as Date | null,
    ...overrides,
  };
}

describe('reply matching', () => {
  it('matches by In-Reply-To against our Message-ID', () => {
    const result = matchReply(
      inbound({ inReplyTo: '<ABC@example.invalid>' }),
      [outbound()],
    );
    expect(result).toEqual({ kind: 'header', outboundId: 'ob1' });
  });

  it('matches by References when In-Reply-To is absent', () => {
    const result = matchReply(
      inbound({
        references: ['<other@x.invalid>', '<abc@example.invalid>'],
        fromEmail: null,
        subject: null,
        receivedAt: null,
      }),
      [outbound()],
    );
    expect(result).toEqual({ kind: 'header', outboundId: 'ob1' });
  });

  it('falls back when headers are absent but the candidate is unique', () => {
    const result = matchReply(
      inbound({ inReplyTo: null, references: [], subject: 'RE: Price inquiry: Abachi' }),
      [outbound()],
    );
    expect(result).toEqual({ kind: 'fallback', outboundId: 'ob1' });
  });

  it('leaves an ambiguous fallback unmatched', () => {
    const result = matchReply(inbound({ inReplyTo: null, references: [] }), [
      outbound({ id: 'ob1' }),
      outbound({ id: 'ob2', messageId: '<def@example.invalid>' }),
    ]);
    expect(result).toEqual({ kind: 'ambiguous' });
  });

  it('does not match on subject alone without a sender relationship', () => {
    const result = matchReply(
      inbound({ inReplyTo: null, references: [], fromEmail: 'other@x.invalid' }),
      [outbound()],
    );
    expect(result).toEqual({ kind: 'none' });
  });

  it('excludes a message whose Message-ID equals our outbound Message-ID', () => {
    const result = matchReply(
      inbound({
        providerMessageId: '<abc@example.invalid>',
        inReplyTo: null,
        references: [],
        subject: 'Price inquiry: Abachi',
      }),
      [outbound()],
    );
    expect(result).toEqual({ kind: 'none' });
    expect(
      isOutgoingCopy(
        { ...inbound({ providerMessageId: '<abc@example.invalid>' }) },
        [outbound()],
      ),
    ).toBe(true);
  });

  it('does not treat a reply (new Message-ID, In-Reply-To set) as an outgoing copy', () => {
    const result = matchReply(
      inbound({
        providerMessageId: '<fresh@supplier.invalid>',
        inReplyTo: '<abc@example.invalid>',
      }),
      [outbound()],
    );
    expect(result).toEqual({ kind: 'header', outboundId: 'ob1' });
  });

  it('normalizes localized reply/forward prefixes', () => {
    expect(normalizeSubject('Re: Fwd: Re: Price inquiry')).toBe(
      'price inquiry',
    );
    expect(normalizeSubject('Ats.: Price inquiry: Abachi')).toBe(
      'price inquiry: abachi',
    );
    expect(normalizeSubject('AW: Antw: Odp: Topic')).toBe('topic');
  });
});
