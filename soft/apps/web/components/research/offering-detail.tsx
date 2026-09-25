import { Badge } from "@/components/ui/badge";
import {
  ClaimTypeBadge,
  ConfidenceBadge,
  VerificationBadge,
} from "./badges";
import { LIFECYCLE_LABEL } from "@/lib/research/claims";
import {
  BASIS_LABEL,
  MATCH_TYPE_LABEL,
  MATCH_TYPE_TONE,
  offeringUncertainty,
  SAMPLE_LABEL,
  VAT_LABEL,
  type OfferingClaimReview,
} from "@/lib/research/offerings";
import { UNKNOWN_CELL } from "@/lib/research/offerings-table";
import { OutreachDecisionControl } from "@features/manage-outreach-decision";
import { formatDateTime } from "@shared/lib/format";
import type { EvidenceRead, OfferingRead } from "@/lib/research/types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className={value ? "text-foreground" : "text-muted-foreground/70"}>
        {value ?? "Not recorded"}
      </span>
    </div>
  );
}

function recordedAmount(offering: OfferingRead): string | null {
  if (offering.priceAmountNumeric === null) return null;
  const currency = offering.priceCurrency ? ` ${offering.priceCurrency}` : "";
  const unit = offering.priceUnit ? ` / ${offering.priceUnit}` : "";
  return `${offering.priceAmountNumeric}${currency}${unit}`;
}

/**
 * The full detail for one offering, moved out of the old card into the row's
 * expandable detail. It keeps every previously shown field, plus provenance,
 * evidence, uncertainty and observed metadata. It never infers a value.
 */
export function OfferingDetail({
  opportunityId,
  offering,
  claimReview,
  linkedClaimEvidence,
}: {
  opportunityId: string;
  offering: OfferingRead;
  claimReview: OfferingClaimReview;
  linkedClaimEvidence: EvidenceRead[];
}) {
  const uncertainty = offeringUncertainty(offering);
  const evidence = offering.evidence;
  const claim = claimReview.claim;
  const underReview =
    claimReview.state === "REPLACED" || claimReview.state === "RETRACTED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={MATCH_TYPE_TONE[offering.matchType]}>
          {MATCH_TYPE_LABEL[offering.matchType]}
        </Badge>
        {offering.applicationText ? (
          <Badge tone="outline">{offering.applicationText}</Badge>
        ) : null}
        <Badge tone="outline">{SAMPLE_LABEL[offering.sampleKind]}</Badge>
        {underReview ? (
          <Badge tone="warning">
            Review: linked finding{" "}
            {LIFECYCLE_LABEL[
              claimReview.state as "REPLACED" | "RETRACTED"
            ].toLowerCase()}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-x-6 gap-y-1 lg:grid-cols-2">
        <Field label="Company" value={offering.companyText} />
        <Field label="Company location" value={offering.companyLocationText} />
        <Field label="Product / specification" value={offering.productText} />
        <Field label="Application" value={offering.applicationText} />
        <Field label="Market served" value={offering.marketServedText} />
        <Field label="Stock / availability" value={null} />
        <Field label="Treatment" value={offering.treatmentText} />
        <Field label="Dimensions" value={offering.dimensionsText} />
        <Field label="Price (original wording)" value={offering.priceText} />
        <Field label="Recorded amount" value={recordedAmount(offering)} />
        <Field label="Currency" value={offering.priceCurrency} />
        <Field label="Unit" value={offering.priceUnit} />
        <Field
          label="VAT"
          value={offering.vatStatus === "UNKNOWN" ? UNKNOWN_CELL : VAT_LABEL[offering.vatStatus]}
        />
        <Field label="Price basis" value={BASIS_LABEL[offering.priceBasis]} />
        <Field
          label="Sample vs full product"
          value={SAMPLE_LABEL[offering.sampleKind]}
        />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Recorded {formatDateTime(offering.createdAt)}</p>
        <p>Last updated {formatDateTime(offering.updatedAt)}</p>
        <p>
          Observed / retrieved {formatDateTime(evidence.retrievedAt)} · Source
          type {evidence.source.sourceType ?? UNKNOWN_CELL}
        </p>
      </div>

      {uncertainty.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Uncertainty (not recorded)
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
            {uncertainty.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={evidence.verificationStatus} />
          <span className="text-xs text-muted-foreground">
            Retrieved {formatDateTime(evidence.retrievedAt)}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {evidence.evidenceText}
        </p>
        <p className="mt-2 text-xs">
          Source:{" "}
          <a
            href={evidence.source.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-primary underline-offset-2 hover:underline"
          >
            {evidence.source.title ?? evidence.source.url}
          </a>
        </p>
      </div>

      {claimReview.state === "CURRENT" && claim ? (
        <div className="rounded-md bg-muted p-3">
          <div className="flex flex-wrap items-center gap-2">
            <ClaimTypeBadge type={claim.type} />
            <ConfidenceBadge confidence={claim.confidence} />
            <span className="text-xs text-muted-foreground">
              Linked finding
            </span>
          </div>
          <p className="mt-2 text-sm">{claim.statement}</p>
          {linkedClaimEvidence.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {linkedClaimEvidence.slice(0, 1).map((item) => (
                <li key={item.id}>{item.evidenceText}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : underReview && claim ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">
              Linked finding{" "}
              {LIFECYCLE_LABEL[
                claimReview.state as "REPLACED" | "RETRACTED"
              ].toLowerCase()}
            </Badge>
            {claim.correctedAt ? (
              <span className="text-xs text-muted-foreground">
                {formatDateTime(claim.correctedAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm">
            The linked finding is no longer current, so this offering is flagged
            for review. Its recorded fields are shown as stored — they have not
            been overwritten from the replacement.
          </p>
          {claim.correctionReason ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Reason: {claim.correctionReason}
            </p>
          ) : null}
          {claim.replacedByClaimId ? (
            <p className="mt-1 text-sm">
              Replaced by{" "}
              <a
                href={`#claim-${claim.replacedByClaimId}`}
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
              >
                {claim.replacedByClaimId}
              </a>
            </p>
          ) : null}
        </div>
      ) : claimReview.state === "MISSING" ? (
        <p className="text-sm text-muted-foreground">
          Linked finding is not present in this run&apos;s claims.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No CURRENT finding is linked to this offering.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Inquiry / clarification: not linked to this offering (the data model does
        not connect offerings to supplier price inquiries yet).
      </p>

      <OutreachDecisionControl
        opportunityId={opportunityId}
        scope={{ kind: "offering", offeringId: offering.id }}
      />
    </div>
  );
}
