/**
 * Read-only shapes returned by the internal contact API.
 *
 * Mirror of `apps/api/src/modules/contact-discovery/domain/types.ts`. Display
 * types only — the dashboard never derives or invents contact values.
 */

export type ContactType = "GENERAL_COMPANY" | "NAMED_PERSON";
export type ContactUsability = "USABLE" | "UNUSABLE";
export type ContactDeliverability = "NOT_VERIFIED" | "VERIFIED" | "UNKNOWN";

export interface ContactSourceRead {
  id: string;
  sourceReferenceId: string;
  url: string;
  title: string | null;
  publisher: string | null;
  sourceType: string | null;
  retrievedAt: string;
  excerptText: string;
}

export interface ContactRead {
  id: string;
  companyId: string;
  contactType: ContactType;
  email: string | null;
  phone: string | null;
  contactPageUrl: string | null;
  personName: string | null;
  personJobTitle: string | null;
  usabilityStatus: ContactUsability;
  unusableReason: string | null;
  deliverabilityStatus: ContactDeliverability;
  unknownsText: string | null;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  dedupKey: string;
  createdAt: string;
  updatedAt: string;
  sources: ContactSourceRead[];
}

export interface ContactActionResult {
  ok: boolean;
  message?: string;
  contact?: ContactRead;
}
