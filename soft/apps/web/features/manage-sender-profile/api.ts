import "server-only";
import { apiRequest } from "@shared/api/client";
import type {
  CreateSenderProfileInput,
  UpdateSenderProfileInput,
} from "@ai-sdr/contracts";
import type { SenderProfileRead } from "@entities/sender-profile";

/** Server-only writes for sender profiles (the internal key stays server-side). */

function enc(value: string): string {
  return encodeURIComponent(value);
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
