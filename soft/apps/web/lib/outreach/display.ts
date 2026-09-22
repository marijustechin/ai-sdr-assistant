import type { OutreachDraftRead, OutreachPreparationStatus } from "./types";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "outline";

export const OUTREACH_STATUS_LABEL: Record<OutreachPreparationStatus, string> = {
  PREPARED: "Prepared",
  BLOCKED: "Blocked — missing information",
};

export const OUTREACH_STATUS_TONE: Record<OutreachPreparationStatus, BadgeTone> =
  {
    PREPARED: "success",
    BLOCKED: "warning",
  };

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
};

export function languageLabel(language: string): string {
  return LANGUAGE_NAMES[language] ?? language;
}

export interface OutreachDraftSummary {
  total: number;
  prepared: number;
  blocked: number;
  stale: number;
}

export function summarizeDrafts(
  drafts: OutreachDraftRead[],
): OutreachDraftSummary {
  const summary: OutreachDraftSummary = {
    total: drafts.length,
    prepared: 0,
    blocked: 0,
    stale: 0,
  };
  for (const draft of drafts) {
    if (draft.preparationStatus === "PREPARED") summary.prepared += 1;
    else summary.blocked += 1;
    if (draft.inputsStale) summary.stale += 1;
  }
  return summary;
}

export interface MissingFieldGuidance {
  key: string;
  label: string;
  hint: string;
  href: string;
}

const MISSING_FIELD_HINTS: Record<string, { label: string; hint: string }> = {
  senderProfileNotAssigned: {
    label: "Sender profile",
    hint: "Assign an active sender profile to this product.",
  },
  senderProfileDisabled: {
    label: "Sender profile",
    hint: "The assigned sender profile is disabled — enable it or assign another.",
  },
  senderName: {
    label: "Sender profile",
    hint: "Assign an active sender profile to this product.",
  },
  senderCompany: {
    label: "Sender profile",
    hint: "Assign an active sender profile to this product.",
  },
  senderRole: {
    label: "Sender profile",
    hint: "Assign an active sender profile to this product.",
  },
  offerSummary: {
    label: "Product offer",
    hint: "Add an offer name so the draft can reference what we offer.",
  },
  offerContext: {
    label: "Product offer",
    hint: "The product/offer context could not be loaded.",
  },
  recipientEmail: {
    label: "Recipient email",
    hint: "Add a usable published business email on the company contacts.",
  },
};

/**
 * Turn raw missing-field keys into operator-facing guidance with a link to the
 * relevant product/settings screen (never a bare field name).
 */
export function missingFieldGuidance(
  fields: string[],
  productId: string,
): MissingFieldGuidance[] {
  const href = `/products/${encodeURIComponent(productId)}`;
  return fields.map((key) => {
    const entry = MISSING_FIELD_HINTS[key] ?? {
      label: key,
      hint: "Resolve this before a draft can be prepared.",
    };
    return { key, label: entry.label, hint: entry.hint, href };
  });
}
