import type {
  ContactDeliverability,
  ContactType,
  ContactUsability,
} from '@ai-sdr/contracts';

export type { ContactDeliverability, ContactType, ContactUsability };

export interface ContactSourceRecord {
  id: string;
  sourceReferenceId: string;
  url: string;
  title: string | null;
  publisher: string | null;
  sourceType: string | null;
  retrievedAt: Date;
  excerptText: string;
}

export interface ContactRecord {
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
  createdAt: Date;
  updatedAt: Date;
  sources: ContactSourceRecord[];
}

export interface ContactSourceData {
  sourceReferenceId: string;
  retrievedAt: Date;
  excerptText: string;
}

export interface CreateContactData {
  companyId: string;
  contactType: ContactType;
  email?: string;
  phone?: string;
  contactPageUrl?: string;
  personName?: string;
  personJobTitle?: string;
  unknownsText?: string;
  deliverabilityStatus?: ContactDeliverability;
  source: ContactSourceData;
}

export interface UpdateContactData {
  usabilityStatus: ContactUsability;
  unusableReason?: string;
  deliverabilityStatus?: ContactDeliverability;
}
