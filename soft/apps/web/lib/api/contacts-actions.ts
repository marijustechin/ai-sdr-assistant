"use server";

import { revalidatePath } from "next/cache";
import { UpdateContactSchema } from "@ai-sdr/contracts";
import { updateCompanyContact } from "./contacts";
import { describeApiError } from "@shared/api/errors";
import type { ContactActionResult } from "@/lib/contacts/types";

/**
 * Record whether a company contact is usable or should be set aside. Runs on the
 * server (the key stays server-side) and re-validates against the shared
 * contract. Provenance and the published values are never modified here.
 */
export async function updateContactUsabilityAction(
  productId: string,
  opportunityId: string,
  leadId: string,
  companyId: string,
  contactId: string,
  values: unknown,
): Promise<ContactActionResult> {
  if (
    [productId, opportunityId, leadId, companyId, contactId].some(
      (value) => typeof value !== "string" || value.length === 0,
    )
  ) {
    return { ok: false, message: "A company and contact id are required." };
  }

  const parsed = UpdateContactSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "The contact could not be updated." };
  }

  try {
    const contact = await updateCompanyContact(
      companyId,
      contactId,
      parsed.data,
    );
    revalidatePath(`/products/${productId}/leads/${opportunityId}/${leadId}`);
    return { ok: true, contact };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(error, "The contact could not be updated."),
    };
  }
}
