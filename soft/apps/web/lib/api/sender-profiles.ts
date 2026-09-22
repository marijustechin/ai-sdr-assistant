import "server-only";
import { apiRequest } from "./client";
import type {
  CreateSenderProfileInput,
  UpdateSenderProfileInput,
} from "@ai-sdr/contracts";
import type { SenderProfileRead } from "@/lib/sender-profiles/types";

/** Server-only reads/writes for sender profiles (the internal key stays server-side). */

function enc(value: string): string {
  return encodeURIComponent(value);
}

export async function listSenderProfiles(): Promise<SenderProfileRead[]> {
  return apiRequest<SenderProfileRead[]>("/sender-profiles", { method: "GET" });
}

export async function getSenderProfile(
  id: string,
): Promise<SenderProfileRead> {
  return apiRequest<SenderProfileRead>(`/sender-profiles/${enc(id)}`, {
    method: "GET",
  });
}

export async function createSenderProfile(
  input: CreateSenderProfileInput,
): Promise<SenderProfileRead> {
  return apiRequest<SenderProfileRead>("/sender-profiles", {
    method: "POST",
    body: input,
  });
}

export async function updateSenderProfile(
  id: string,
  input: UpdateSenderProfileInput,
): Promise<SenderProfileRead> {
  return apiRequest<SenderProfileRead>(`/sender-profiles/${enc(id)}`, {
    method: "PATCH",
    body: input,
  });
}
