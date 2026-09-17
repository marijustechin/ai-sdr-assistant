import { offeringClaimState } from "./offerings";
import type { CheckpointView } from "./checkpoint";
import type {
  ClaimRead,
  OfferingMatchType,
  OfferingPriceBasis,
  OfferingRead,
  OfferingSampleKind,
  OfferingVatStatus,
} from "./types";

/**
 * Product-independent summary of one research run, computed only from persisted
 * records. It never parses price prose and never invents values: an unrecorded
 * field is reported as "not recorded", never as 0.
 *
 * Company identity: there is no canonical company id yet, so companies are
 * deduplicated by the **explicit** `companyText` field (trimmed, whitespace
 * collapsed, case-folded). This is the documented fallback. The source
 * publisher/domain is deliberately NOT used as a company, so a marketplace that
 * merely hosts a listing (e.g. Fordaq) is not counted as a supplier.
 */

export interface SummaryCompany {
  /** First recorded spelling, for display. */
  name: string;
  offerings: number;
}

export interface SummaryOfferingCounts {
  total: number;
  byMatchType: Record<OfferingMatchType, number>;
}

export interface PriceExtreme {
  offeringId: string;
  companyText: string | null;
  productText: string | null;
  /** Kept alongside the price so extrema never imply identical specifications. */
  dimensionsText: string | null;
  amount: number;
  currency: string;
  unit: string;
  sourceUrl: string;
  sourceTitle: string | null;
}

export interface PriceGroup {
  key: string;
  matchType: OfferingMatchType;
  currency: string;
  unit: string;
  vatStatus: OfferingVatStatus;
  priceBasis: OfferingPriceBasis;
  sampleKind: OfferingSampleKind;
  treatmentText: string | null;
  pricedCount: number;
  lowest: PriceExtreme;
  highest: PriceExtreme;
}

export interface ExcludedFromPrices {
  reason: string;
  count: number;
}

export interface SummaryGaps {
  present: boolean;
  totalCells: number;
  coveredCells: number;
  partialCells: number;
  gapCells: number;
  pendingFollowUps: number;
}

export interface RunSummary {
  companies: SummaryCompany[];
  companyCount: number;
  offerings: SummaryOfferingCounts;
  /** Offerings whose numeric amount, currency and unit are all recorded. */
  pricedOfferingCount: number;
  /**
   * Offerings where a price IS recorded but not (fully) structured — price
   * wording without a numeric amount, or an amount missing currency/unit. This
   * is deliberately distinct from `noPriceRecordedCount`.
   */
  unstructuredPriceCount: number;
  /** Offerings with no price information at all (no wording, no amount). */
  noPriceRecordedCount: number;
  priceGroups: PriceGroup[];
  excludedFromPrices: ExcludedFromPrices[];
  gaps: SummaryGaps;
}

function normalizeCompany(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return normalized.length > 0 ? normalized : null;
}

function firstSpelling(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function hasPriceWording(offering: OfferingRead): boolean {
  return (offering.priceText?.trim().length ?? 0) > 0;
}

function usableAmount(
  offering: OfferingRead,
): { amount: number; currency: string; unit: string } | null {
  const { priceAmountNumeric, priceCurrency, priceUnit } = offering;
  if (
    priceAmountNumeric === null ||
    !Number.isFinite(priceAmountNumeric) ||
    priceAmountNumeric <= 0
  ) {
    return null;
  }
  const currency = priceCurrency?.trim();
  const unit = priceUnit?.trim();
  if (!currency || !unit) return null;
  return { amount: priceAmountNumeric, currency, unit };
}

function groupKey(offering: OfferingRead, parts: {
  currency: string;
  unit: string;
}): string {
  return [
    offering.matchType,
    parts.currency,
    parts.unit,
    offering.vatStatus,
    offering.priceBasis,
    offering.sampleKind,
    offering.treatmentText?.trim().toLocaleLowerCase("en") ?? "",
  ].join("|");
}

function toExtreme(
  offering: OfferingRead,
  amount: number,
  currency: string,
  unit: string,
): PriceExtreme {
  return {
    offeringId: offering.id,
    companyText: offering.companyText,
    productText: offering.productText,
    dimensionsText: offering.dimensionsText,
    amount,
    currency,
    unit,
    sourceUrl: offering.evidence.source.url,
    sourceTitle: offering.evidence.source.title,
  };
}

export function buildRunSummary(
  offerings: OfferingRead[],
  claims: ClaimRead[],
  checkpoint: CheckpointView,
): RunSummary {
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));

  const byMatchType: Record<OfferingMatchType, number> = {
    EXACT_MATCH: 0,
    ADJACENT: 0,
    SUBSTITUTE: 0,
    UNKNOWN: 0,
  };
  const companyMap = new Map<string, SummaryCompany>();
  const groups = new Map<string, PriceGroup>();
  const excluded = new Map<string, number>();
  let pricedOfferingCount = 0;
  let unstructuredPriceCount = 0;
  let noPriceRecordedCount = 0;

  const exclude = (reason: string) => {
    excluded.set(reason, (excluded.get(reason) ?? 0) + 1);
  };

  for (const offering of offerings) {
    byMatchType[offering.matchType] += 1;

    const companyKey = normalizeCompany(offering.companyText);
    if (companyKey) {
      const existing = companyMap.get(companyKey);
      if (existing) {
        existing.offerings += 1;
      } else {
        companyMap.set(companyKey, {
          name: firstSpelling(offering.companyText as string),
          offerings: 1,
        });
      }
    }

    const amount = usableAmount(offering);
    const hasWording = hasPriceWording(offering);
    const hasAmountField =
      offering.priceAmountNumeric !== null &&
      Number.isFinite(offering.priceAmountNumeric);

    // Distinguish "no price" from "price recorded but not structured yet".
    if (!hasWording && !hasAmountField) {
      noPriceRecordedCount += 1;
      continue;
    }
    if (!amount) {
      // Price information exists but is not fully structured (amount,
      // currency or unit missing) — never guess it into a range.
      unstructuredPriceCount += 1;
      continue;
    }

    const claimState = offeringClaimState(offering, claimsById).state;
    if (
      claimState === "REPLACED" ||
      claimState === "RETRACTED" ||
      claimState === "MISSING"
    ) {
      exclude(
        "Linked finding replaced, retracted or unresolved (flagged for review)",
      );
      continue;
    }
    if (offering.matchType === "UNKNOWN") {
      exclude("Exact/adjacent/substitute classification not recorded");
      continue;
    }

    pricedOfferingCount += 1;
    const key = groupKey(offering, amount);
    const extreme = toExtreme(offering, amount.amount, amount.currency, amount.unit);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        matchType: offering.matchType,
        currency: amount.currency,
        unit: amount.unit,
        vatStatus: offering.vatStatus,
        priceBasis: offering.priceBasis,
        sampleKind: offering.sampleKind,
        treatmentText: offering.treatmentText,
        pricedCount: 1,
        lowest: extreme,
        highest: extreme,
      });
    } else {
      existing.pricedCount += 1;
      if (amount.amount < existing.lowest.amount) existing.lowest = extreme;
      if (amount.amount > existing.highest.amount) existing.highest = extreme;
    }
  }

  const gaps: SummaryGaps = {
    present: checkpoint.present,
    totalCells: checkpoint.coverage.length,
    coveredCells: checkpoint.coverage.filter((cell) => cell.status === "COVERED")
      .length,
    partialCells: checkpoint.coverage.filter((cell) => cell.status === "PARTIAL")
      .length,
    gapCells: checkpoint.coverage.filter((cell) => cell.status === "GAP").length,
    pendingFollowUps: checkpoint.pendingFollowUps.length,
  };

  const companies = [...companyMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    companies,
    companyCount: companies.length,
    offerings: { total: offerings.length, byMatchType },
    pricedOfferingCount,
    unstructuredPriceCount,
    noPriceRecordedCount,
    priceGroups: [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)),
    excludedFromPrices: [...excluded.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    gaps,
  };
}

/** Neutral numeric display; no currency conversion and no unit conversion. */
export function formatObservedAmount(extreme: PriceExtreme): string {
  const number = extreme.amount.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
  return `${number} ${extreme.currency} / ${extreme.unit}`;
}

/** True when a group has a single distinct price (lowest === highest). */
export function isSinglePrice(group: PriceGroup): boolean {
  return group.lowest.amount === group.highest.amount;
}
