"use server";

import { revalidatePath } from "next/cache";
import { SetOutreachDecisionSchema } from "@ai-sdr/contracts";
import { describeApiError } from "@shared/api/errors";
import type {
  OutreachDecisionActionResult,
  OutreachDecisionRead,
} from "@entities/outreach-draft";

/** Canonical company-scoped decision (used from the lead detail when a lead exists). */
export async function setOutreachDecisionForCompanyAction(
  productId: string,
  opportunityId: string,
  companyId: string,
  values: unknown,
): Promise<OutreachDecisionActionResult> {
  const parsed = SetOutreachDecisionSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please choose a valid outreach decision." };
  }
  try {
    const { setOutreachDecisionForCompany } = await import("./api");
    const decision = await setOutreachDecisionForCompany(
      opportunityId,
      companyId,
      parsed.data,
    );
    revalidatePath(`/products/${encodeURIComponent(productId)}/leads`);
    return { ok: true, decision };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The outreach decision could not be saved.",
      ),
    };
  }
}

/**
 * Offering-scoped decision used from Market Research results. The API resolves
 * (or, on save, creates) the offering's company so this works before any lead
 * exists; it stores the same authoritative record.
 */
export async function setOutreachDecisionForOfferingAction(
  opportunityId: string,
  offeringId: string,
  values: unknown,
): Promise<OutreachDecisionActionResult> {
  const parsed = SetOutreachDecisionSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Please choose a valid outreach decision." };
  }
  try {
    const { setOutreachDecisionForOffering } = await import("./api");
    const decision = await setOutreachDecisionForOffering(
      opportunityId,
      offeringId,
      parsed.data,
    );
    return { ok: true, decision };
  } catch (error) {
    return {
      ok: false,
      message: describeApiError(
        error,
        "The outreach decision could not be saved.",
      ),
    };
  }
}

/** Lazily loads the decision for an offering (read-only; never creates a company). */
export async function loadOfferingDecisionAction(
  opportunityId: string,
  offeringId: string,
): Promise<OutreachDecisionRead | null> {
  try {
    const { getOutreachDecisionForOffering } = await import(
      "@entities/outreach-draft/api"
    );
    return await getOutreachDecisionForOffering(opportunityId, offeringId);
  } catch {
    return null;
  }
}
