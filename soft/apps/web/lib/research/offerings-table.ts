import {
  groupOfferingsByMatch,
  offeringClaimState,
  VAT_LABEL,
  type OfferingClaimReview,
} from "./offerings";
import type {
  ClaimRead,
  EvidenceRead,
  OfferingMatchType,
  OfferingRead,
} from "./types";

/**
 * Cell value used when a field was not recorded. It is never derived from
 * prose or another field — an unknown value is always shown as this marker.
 */
export const UNKNOWN_CELL = "—";

function recorded(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_CELL;
}

/**
 * The compact, scannable cells of one offering table row. Every value is either
 * a recorded structured field or `UNKNOWN_CELL`; nothing is inferred.
 */
export interface OfferingRowCells {
  company: string;
  product: string;
  price: string;
  unit: string;
  vat: string;
  market: string;
  stock: string;
  matchType: OfferingMatchType;
}

export function offeringRowCells(offering: OfferingRead): OfferingRowCells {
  return {
    company: recorded(offering.companyText),
    product: recorded(offering.productText),
    price: recorded(offering.priceText),
    unit: recorded(offering.priceUnit),
    vat:
      offering.vatStatus === "UNKNOWN"
        ? UNKNOWN_CELL
        : VAT_LABEL[offering.vatStatus],
    market: recorded(offering.marketServedText),
    // An offering carries no structured stock/availability field today, and it
    // is never inferred from the evidence prose, so the cell is unrecorded.
    stock: UNKNOWN_CELL,
    matchType: offering.matchType,
  };
}

export interface OfferingTableRow {
  offering: OfferingRead;
  cells: OfferingRowCells;
  /** Linked-claim review state, so a replaced/retracted finding is flagged. */
  review: OfferingClaimReview;
  linkedClaimEvidence: EvidenceRead[];
}

export interface OfferingTableGroup {
  matchType: OfferingMatchType;
  rows: OfferingTableRow[];
}

export function linkedClaimEvidenceFor(
  review: OfferingClaimReview,
  evidenceById: Map<string, EvidenceRead>,
): EvidenceRead[] {
  if (!review.claim) return [];
  return review.claim.evidence
    .map((link) => evidenceById.get(link.evidenceId))
    .filter((item): item is EvidenceRead => item !== undefined);
}

/**
 * One table row per offering, grouped exact → adjacent → substitute →
 * unclassified. Pure and serializable so it can be composed on the server and
 * rendered by a client component.
 */
export function buildOfferingTableGroups(
  offerings: OfferingRead[],
  claimsById: Map<string, ClaimRead>,
  evidenceById: Map<string, EvidenceRead>,
): OfferingTableGroup[] {
  return groupOfferingsByMatch(offerings).map((group) => ({
    matchType: group.matchType,
    rows: group.offerings.map((offering) => {
      const review = offeringClaimState(offering, claimsById);
      return {
        offering,
        cells: offeringRowCells(offering),
        review,
        linkedClaimEvidence: linkedClaimEvidenceFor(review, evidenceById),
      };
    }),
  }));
}

/**
 * Expansion state for a single-open-row table: selecting a new row opens it and
 * closes any other; selecting the open row closes it.
 */
export function toggleExpandedRow(
  current: string | null,
  id: string,
): string | null {
  return current === id ? null : id;
}
