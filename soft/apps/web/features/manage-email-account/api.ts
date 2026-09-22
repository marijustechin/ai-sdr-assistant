import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  CreateEmailAccountInput,
  UpdateEmailAccountInput,
} from "@ai-sdr/contracts";
import type { EmailAccountRead } from "@entities/email-account";

/** Server-only writes for email accounts (the internal key stays server-side). */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function createEmailAccount(
  input: CreateEmailAccountInput,
): Promise<EmailAccountRead> {
  return apiRequest<EmailAccountRead>("/email-accounts", {
    method: "POST",
    body: input,
  });
}

export async function updateEmailAccount(
  id: string,
  input: UpdateEmailAccountInput,
): Promise<EmailAccountRead> {
  return apiRequest<EmailAccountRead>(`/email-accounts/${enc(id)}`, {
    method: "PATCH",
    body: input,
  });
}
