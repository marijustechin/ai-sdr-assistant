import "server-only";
import { apiRequest } from "@shared/api/client";
import type { EmailAccountRead } from "./types";

/** Server-only reads for email accounts (the internal key stays server-side). */

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
