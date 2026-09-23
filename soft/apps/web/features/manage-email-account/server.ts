import "server-only";
import type {
  MailboxTestSendResponse,
  MailboxVerificationResponse,
} from "@ai-sdr/contracts";
import { apiRequest } from "@shared/api/client";

/**
 * Server-only bounded mailbox verification calls for the email-account feature.
 * The internal API key never reaches the browser; the stored password is
 * decrypted only inside the API and is never returned.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function verifySmtp(
  accountId: string,
): Promise<MailboxVerificationResponse> {
  return apiRequest<MailboxVerificationResponse>(
    `/email-accounts/${enc(accountId)}/verify-smtp`,
    { method: "POST", timeoutMs: 30000 },
  );
}

export async function verifyImap(
  accountId: string,
): Promise<MailboxVerificationResponse> {
  return apiRequest<MailboxVerificationResponse>(
    `/email-accounts/${enc(accountId)}/verify-imap`,
    { method: "POST", timeoutMs: 30000 },
  );
}

export async function sendTestMessage(
  accountId: string,
  to: string,
): Promise<MailboxTestSendResponse> {
  return apiRequest<MailboxTestSendResponse>(
    `/email-accounts/${enc(accountId)}/test-send`,
    { method: "POST", body: { to, confirm: true }, timeoutMs: 30000 },
  );
}
