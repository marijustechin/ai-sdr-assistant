import "server-only";
import { apiRequest } from "@shared/api/client";
import type { SenderProfileRead } from "./types";

/** Server-only reads for sender profiles (the internal key stays server-side). */

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
