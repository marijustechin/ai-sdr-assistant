/**
 * UI-session state for the bounded mailbox verification actions.
 *
 * Each action (SMTP, IMAP, test send) has its own independent state so one
 * action never displays another action's pending/success/error result. This is
 * ephemeral browser state only — it is never persisted to the database.
 */

export type VerificationStatus = "idle" | "pending" | "success" | "error";

export interface VerificationState {
  status: VerificationStatus;
  /** Safe, already-redacted detail from the API result. */
  detail?: string;
}

export const IDLE_VERIFICATION: VerificationState = { status: "idle" };

export function pendingVerification(): VerificationState {
  return { status: "pending" };
}

export function successVerification(detail: string): VerificationState {
  return { status: "success", detail };
}

export function errorVerification(detail: string): VerificationState {
  return { status: "error", detail };
}

export type VerificationChannel = "smtp" | "imap" | "send";

export interface VerificationButtonView {
  label: string;
  disabled: boolean;
  variant: "outline" | "destructive";
  className: string;
}

const LABELS: Record<
  VerificationChannel,
  { idle: string; pending: string; success: string }
> = {
  smtp: {
    idle: "Verify SMTP login",
    pending: "Verifying…",
    success: "SMTP verified",
  },
  imap: {
    idle: "Verify IMAP access",
    pending: "Verifying…",
    success: "IMAP verified",
  },
  send: {
    idle: "Send test message",
    pending: "Sending…",
    success: "Test message sent",
  },
};

/** The emerald "verified" style; only applied while the action has succeeded. */
export const VERIFIED_BUTTON_CLASS =
  "border-emerald-300 bg-emerald-300 text-emerald-950 hover:bg-emerald-300/90";

/** Derives the button label/style from this action's own state only. */
export function verificationButtonView(
  state: VerificationState,
  channel: VerificationChannel,
): VerificationButtonView {
  const labels = LABELS[channel];
  switch (state.status) {
    case "pending":
      return {
        label: labels.pending,
        disabled: true,
        variant: "outline",
        className: "cursor-progress",
      };
    case "success":
      return {
        label: labels.success,
        disabled: false,
        variant: "outline",
        className: VERIFIED_BUTTON_CLASS,
      };
    case "error":
      return {
        label: labels.idle,
        disabled: false,
        variant: "destructive",
        className: "cursor-pointer",
      };
    default:
      return {
        label: labels.idle,
        disabled: false,
        variant: "outline",
        className: "cursor-pointer",
      };
  }
}

/** The safe detail/message for a finished action, or `null` while idle/pending. */
export function verificationDetail(state: VerificationState): string | null {
  if (state.status === "success" || state.status === "error") {
    return state.detail ?? null;
  }
  return null;
}

/** True when the finished action succeeded (drives the success message tone). */
export function isVerificationSuccess(state: VerificationState): boolean {
  return state.status === "success";
}
