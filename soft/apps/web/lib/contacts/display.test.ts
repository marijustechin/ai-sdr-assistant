import { describe, it, expect } from "vitest";
import {
  contactChannels,
  contactDeliverabilityLabel,
  contactHeading,
  contactTypeLabel,
  summarizeContacts,
} from "./display";
import type { ContactRead } from "./types";

function contact(overrides: Partial<ContactRead> = {}): ContactRead {
  return {
    id: "contact-1",
    companyId: "company-1",
    contactType: "GENERAL_COMPANY",
    email: "info@example.invalid",
    phone: null,
    contactPageUrl: null,
    personName: null,
    personJobTitle: null,
    usabilityStatus: "USABLE",
    unusableReason: null,
    deliverabilityStatus: "NOT_VERIFIED",
    unknownsText: null,
    normalizedEmail: "info@example.invalid",
    normalizedPhone: null,
    dedupKey: "abc",
    createdAt: "2026-09-18T08:00:00.000Z",
    updatedAt: "2026-09-18T08:00:00.000Z",
    sources: [
      {
        id: "source-1",
        sourceReferenceId: "ref-1",
        url: "https://example.invalid/contact",
        title: "Contact",
        publisher: null,
        sourceType: null,
        retrievedAt: "2026-09-18T08:00:00.000Z",
        excerptText: "info@example.invalid",
      },
    ],
    ...overrides,
  };
}

describe("contact display helpers", () => {
  it("labels contact type and deliverability", () => {
    expect(contactTypeLabel("GENERAL_COMPANY")).toBe("General company");
    expect(contactTypeLabel("NAMED_PERSON")).toBe("Named person");
    expect(contactDeliverabilityLabel("NOT_VERIFIED")).toContain(
      "not deliverability-checked",
    );
  });

  it("heads a named-person contact with the person and a general one with its channel", () => {
    expect(
      contactHeading(
        contact({
          contactType: "NAMED_PERSON",
          personName: "Jane Doe",
          personJobTitle: "Purchasing Manager",
        }),
      ),
    ).toBe("Jane Doe");
    expect(contactHeading(contact())).toBe("info@example.invalid");
  });

  it("lists the recorded channels with copy values and stable order", () => {
    const channels = contactChannels(
      contact({
        email: "info@example.invalid",
        phone: "+370 600 00000",
        contactPageUrl: "https://example.invalid/contact",
      }),
    );
    expect(channels.map((c) => c.key)).toEqual([
      "email",
      "phone",
      "contactPageUrl",
    ]);
    expect(channels[0]?.copyValue).toBe("info@example.invalid");
    expect(channels[1]?.href).toBe("tel:+37060000000");
    expect(channels[2]?.href).toBe("https://example.invalid/contact");
  });

  it("summarizes contacts and counts unusable ones", () => {
    expect(
      summarizeContacts([
        contact({ id: "a" }),
        contact({ id: "b", contactType: "NAMED_PERSON", personName: "Jane" }),
        contact({ id: "c", usabilityStatus: "UNUSABLE" }),
      ]),
    ).toEqual({ total: 3, general: 2, named: 1, unusable: 1 });
  });
});
