import type { PriceInquiryStatus } from "./types";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "outline";

export const PRICE_INQUIRY_STATUS_LABEL: Record<PriceInquiryStatus, string> = {
  READY_FOR_HUMAN_REVIEW: "Ready for human review",
  SENT: "Sent — awaiting reply",
  REPLY_RECEIVED: "Reply received",
  QUOTE_EXTRACTED: "Quote extracted",
};

export const PRICE_INQUIRY_STATUS_TONE: Record<PriceInquiryStatus, BadgeTone> = {
  READY_FOR_HUMAN_REVIEW: "info",
  SENT: "warning",
  REPLY_RECEIVED: "info",
  QUOTE_EXTRACTED: "success",
};

/**
 * A sender profile may be offered for a price inquiry only when it is active and
 * linked to an email account (the API enforces this too).
 */
export function isUsableSenderProfile(profile: {
  status: string;
  emailAccountId: string | null;
}): boolean {
  return profile.status === "ACTIVE" && profile.emailAccountId !== null;
}
