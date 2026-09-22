import "server-only";
import { apiRequest } from "./client";
import type {
  CreateEmailAccountInput,
  UpdateEmailAccountInput,
} from "@ai-sdr/contracts";
import type { EmailAccountRead } from "@/lib/email-accounts/types";

/** Server-only reads/writes for email accounts (the internal key stays server-side). */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function listEmailAccounts(): Promise<EmailAccountRead[]> {
  return apiRequest<EmailAccountRead[]>("/email-accounts", { method: "GET" });
}

export async function getEmailAccount(id: string): Promise<EmailAccountRead> {
  return apiRequest<EmailAccountRead>(`/email-accounts/${enc(id)}`, {
    method: "GET",
  });
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
