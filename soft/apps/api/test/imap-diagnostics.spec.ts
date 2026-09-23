import { describe, it, expect } from 'vitest';
import {
  classifyImapConnectError,
  safeErrorCode,
  sampleFetchRange,
} from '../src/modules/email-accounts/domain/imap-diagnostics.js';

describe('IMAP failure classification', () => {
  it('classifies authentication failures by the ImapFlow flag or code', () => {
    expect(
      classifyImapConnectError({ authenticationFailed: true, code: 'EAUTH' }),
    ).toEqual({ stage: 'authentication', code: 'EAUTH' });
    expect(classifyImapConnectError({ code: 'AUTHENTICATIONFAILED' })).toEqual({
      stage: 'authentication',
      code: 'EAUTH',
    });
  });

  it('classifies TCP and TLS failures distinctly', () => {
    expect(classifyImapConnectError({ code: 'ECONNREFUSED' })).toEqual({
      stage: 'tcp',
      code: 'ECONNREFUSED',
    });
    expect(classifyImapConnectError({ code: 'ENOTFOUND' })).toEqual({
      stage: 'tcp',
      code: 'ENOTFOUND',
    });
    expect(
      classifyImapConnectError({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' }),
    ).toEqual({ stage: 'tls', code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    expect(
      classifyImapConnectError({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }),
    ).toEqual({ stage: 'tls', code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' });
  });

  it('classifies timeouts and generic errors', () => {
    expect(classifyImapConnectError({ code: 'ETIMEOUT' })).toEqual({
      stage: 'timeout',
      code: 'ETIMEOUT',
    });
    expect(classifyImapConnectError({ name: 'TimeoutError', code: undefined })).toEqual(
      { stage: 'timeout', code: 'ETIMEOUT' },
    );
    expect(classifyImapConnectError({ code: 'SOMETHING_ODD' })).toEqual({
      stage: 'connect',
      code: 'SOMETHING_ODD',
    });
  });

  it('never surfaces a message or sensitive text as a code', () => {
    expect(safeErrorCode({ code: 'has spaces and : secrets' })).toBe('error');
    expect(safeErrorCode(new Error('password=secret'))).toBe('error');
    expect(safeErrorCode(undefined)).toBe('error');
    expect(safeErrorCode({ code: 'ECONNRESET' })).toBe('ECONNRESET');
  });
});

describe('empty-mailbox handling', () => {
  it('does not fetch a range when the mailbox is empty', () => {
    expect(sampleFetchRange(0)).toBeNull();
    expect(sampleFetchRange(-1)).toBeNull();
    expect(sampleFetchRange(Number.NaN)).toBeNull();
  });

  it('bounds the fetch range to at most three messages', () => {
    expect(sampleFetchRange(1)).toBe('1:1');
    expect(sampleFetchRange(3)).toBe('1:3');
    expect(sampleFetchRange(500)).toBe('1:3');
  });
});
