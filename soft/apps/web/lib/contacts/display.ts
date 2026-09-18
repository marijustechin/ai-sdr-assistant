import type {
  ContactDeliverability,
  ContactRead,
  ContactType,
} from "./types";

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  GENERAL_COMPANY: "General company",
  NAMED_PERSON: "Named person",
};

export const CONTACT_DELIVERABILITY_LABEL: Record<ContactDeliverability, string> =
  {
    NOT_VERIFIED: "Published on source — not deliverability-checked",
    VERIFIED: "Deliverability verified",
    UNKNOWN: "Deliverability unknown",
  };

export function contactTypeLabel(type: ContactType): string {
  return CONTACT_TYPE_LABEL[type];
}

export function contactDeliverabilityLabel(
  status: ContactDeliverability,
): string {
  return CONTACT_DELIVERABILITY_LABEL[status];
}

/** A short heading for a contact row: the person when named, else the channel. */
export function contactHeading(contact: ContactRead): string {
  if (contact.contactType === "NAMED_PERSON" && contact.personName) {
    return contact.personName;
  }
  return contact.email ?? contact.phone ?? contact.contactPageUrl ?? "Contact";
}

export interface ContactChannel {
  key: "email" | "phone" | "contactPageUrl";
  label: "Email" | "Phone" | "Contact page";
  display: string;
  href: string | null;
  copyValue: string;
}

/** The channels that are actually recorded, in a stable order. */
export function contactChannels(contact: ContactRead): ContactChannel[] {
  const channels: ContactChannel[] = [];
  if (contact.email) {
    channels.push({
      key: "email",
      label: "Email",
      display: contact.email,
      href: `mailto:${contact.email}`,
      copyValue: contact.email,
    });
  }
  if (contact.phone) {
    channels.push({
      key: "phone",
      label: "Phone",
      display: contact.phone,
      href: `tel:${contact.phone.replace(/[^+\d]/g, "")}`,
      copyValue: contact.phone,
    });
  }
  if (contact.contactPageUrl) {
    channels.push({
      key: "contactPageUrl",
      label: "Contact page",
      display: contact.contactPageUrl,
      href: contact.contactPageUrl,
      copyValue: contact.contactPageUrl,
    });
  }
  return channels;
}

export interface ContactSummary {
  total: number;
  general: number;
  named: number;
  unusable: number;
}

export function summarizeContacts(contacts: ContactRead[]): ContactSummary {
  const summary: ContactSummary = {
    total: contacts.length,
    general: 0,
    named: 0,
    unusable: 0,
  };
  for (const contact of contacts) {
    if (contact.contactType === "GENERAL_COMPANY") summary.general += 1;
    else summary.named += 1;
    if (contact.usabilityStatus === "UNUSABLE") summary.unusable += 1;
  }
  return summary;
}
