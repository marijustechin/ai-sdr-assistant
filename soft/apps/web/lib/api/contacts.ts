import "server-only";
import { apiRequest } from "./client";
import type {
  ContactDeliverability,
  ContactRead,
  ContactUsability,
} from "@/lib/contacts/types";

/**
 * Server-only reads/writes for company contacts. The internal API key is
 * attached by `apiRequest`; it never reaches the browser.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** GET /companies/:companyId/contacts — published contacts for one company. */
export async function listCompanyContacts(
  companyId: string,
): Promise<ContactRead[]> {
  return apiRequest<ContactRead[]>(`/companies/${enc(companyId)}/contacts`, {
    method: "GET",
  });
}

/** PATCH /companies/:companyId/contacts/:contactId — usability/deliverability. */
export async function updateCompanyContact(
  companyId: string,
  contactId: string,
  input: {
    usabilityStatus: ContactUsability;
    unusableReason?: string;
    deliverabilityStatus?: ContactDeliverability;
  },
): Promise<ContactRead> {
  return apiRequest<ContactRead>(
    `/companies/${enc(companyId)}/contacts/${enc(contactId)}`,
    { method: "PATCH", body: input },
  );
}
