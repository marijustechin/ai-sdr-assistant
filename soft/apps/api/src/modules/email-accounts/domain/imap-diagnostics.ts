/**
 * Pure helpers for classifying a password IMAP verification failure by stage.
 *
 * Only short, safe codes are produced — never a raw provider response, a
 * password, a ciphertext, or a stack trace. The stage is reported in the human
 * readable `detail` string by the caller.
 */

export type ImapFailureStage =
  | 'tcp'
  | 'tls'
  | 'authentication'
  | 'inbox_open'
  | 'header_fetch'
  | 'timeout'
  | 'connect';

/** Node/OpenSSL certificate verification codes. */
const TLS_ERROR_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'ERR_SSL_PACKET_LENGTH_TOO_LONG',
]);

/** Socket-level connectivity codes. */
const TCP_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ECONNRESET',
  'EPIPE',
  'ECONNABORTED',
]);

/** Extracts a short, safe machine code. Never returns a message. */
export function safeErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'error';
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && /^[A-Za-z0-9_.-]{1,48}$/.test(code)) {
    return code;
  }
  return 'error';
}

function isTimeout(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; name?: unknown };
  return (
    candidate.code === 'ETIMEOUT' ||
    candidate.name === 'TimeoutError' ||
    candidate.code === 'ERR_SOCKET_CONNECTION_TIMEOUT'
  );
}

function isAuthenticationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { authenticationFailed?: unknown; code?: unknown };
  return (
    candidate.authenticationFailed === true ||
    candidate.code === 'EAUTH' ||
    candidate.code === 'AUTHENTICATIONFAILED'
  );
}

/**
 * Classifies a failure from the connection/auth phase (TCP + TLS + greeting +
 * authentication happen inside `ImapFlow.connect()`).
 */
export function classifyImapConnectError(error: unknown): {
  stage: ImapFailureStage;
  code: string;
} {
  if (isAuthenticationError(error)) {
    return { stage: 'authentication', code: 'EAUTH' };
  }
  if (isTimeout(error)) {
    return { stage: 'timeout', code: 'ETIMEOUT' };
  }
  const code = safeErrorCode(error);
  if (TLS_ERROR_CODES.has(code)) {
    return { stage: 'tls', code };
  }
  if (TCP_ERROR_CODES.has(code)) {
    return { stage: 'tcp', code };
  }
  return { stage: 'connect', code };
}

/**
 * The bounded FETCH range for a mailbox with `exists` messages. Returns `null`
 * when the mailbox is empty, so an empty mailbox is a *successful* verification
 * rather than a fetch over a non-existent range.
 */
export function sampleFetchRange(exists: number): string | null {
  if (!Number.isFinite(exists) || exists <= 0) {
    return null;
  }
  return `1:${Math.min(Math.floor(exists), 3)}`;
}
