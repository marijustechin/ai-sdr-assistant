import type { SenderProfileRead, SenderProfileStatus } from "./types";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "outline";

export const SENDER_PROFILE_STATUS_LABEL: Record<
  SenderProfileStatus,
  string
> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export const SENDER_PROFILE_STATUS_TONE: Record<
  SenderProfileStatus,
  BadgeTone
> = {
  ACTIVE: "success",
  DISABLED: "neutral",
};

/** Operator-facing mailbox reference summary (never a credential). */
export function mailboxSummary(
  accountId: string | null,
  accounts: Array<{ id: string; label: string }>,
): string {
  if (!accountId) return "No mailbox connection";
  const account = accounts.find((candidate) => candidate.id === accountId);
  return account ? `Mailbox: ${account.label}` : "Mailbox: unknown account";
}

/**
 * Sender-profile choices for a product's assignment selector. Disabled profiles
 * are included (so an existing assignment is shown) but marked disabled; no
 * profile is auto-selected.
 */
export function profileOptions(profiles: SenderProfileRead[]): Array<{
  id: string;
  label: string;
  disabled: boolean;
}> {
  return profiles.map((profile) => ({
    id: profile.id,
    label: profile.label,
    disabled: profile.status !== "ACTIVE",
  }));
}
