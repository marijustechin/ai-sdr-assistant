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
  offeringDisplayName,
  offeringUncertainty,
  SAMPLE_LABEL,
  VAT_LABEL,
  type OfferingClaimReview,
} from "@/lib/research/offerings";
import { formatDateTime } from "@/lib/format";
import type { EvidenceRead, OfferingRead } from "@/lib/research/types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span className={value ? "text-foreground" : "text-muted-foreground/70"}>
        {value ?? "Not recorded"}
      </span>
    </div>
  );
}

export function OfferingCard({
  offering,
  claimReview,
  linkedClaimEvidence,
}: {
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
    <li className="rounded-lg border border-border p-4">
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
            Review: linked finding {LIFECYCLE_LABEL[claimReview.state as "REPLACED" | "RETRACTED"].toLowerCase()}
          </Badge>
        ) : null}
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">
        {offeringDisplayName(offering)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {offering.companyLocationText ?? "Location not recorded"} ·{" "}
        {offering.marketServedText ?? "Market served not recorded"}
      </p>
      <p className="mt-1 text-sm">
        {offering.priceText ? (
          <span className="text-foreground">{offering.priceText}</span>
        ) : (
          <span className="text-muted-foreground/70">Price not recorded.</span>
        )}
      </p>

      <details className="group mt-3">
        <summary className="cursor-pointer text-sm text-primary underline-offset-2 hover:underline">
          Details, provenance &amp; uncertainty
        </summary>
        <div className="mt-3 space-y-4 border-t border-border pt-3">
          <div className="space-y-1">
            <Field label="Company location" value={offering.companyLocationText} />
            <Field label="Market served" value={offering.marketServedText} />
            <Field label="Application" value={offering.applicationText} />
            <Field label="Treatment" value={offering.treatmentText} />
            <Field label="Dimensions" value={offering.dimensionsText} />
            <Field label="Price (original wording)" value={offering.priceText} />
            <Field label="Currency" value={offering.priceCurrency} />
            <Field label="Unit" value={offering.priceUnit} />
            <Field label="VAT" value={VAT_LABEL[offering.vatStatus]} />
            <Field label="Price basis" value={BASIS_LABEL[offering.priceBasis]} />
            <Field label="Sample vs full product" value={SAMPLE_LABEL[offering.sampleKind]} />
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
                  Linked finding {LIFECYCLE_LABEL[claimReview.state as "REPLACED" | "RETRACTED"].toLowerCase()}
                </Badge>
                {claim.correctedAt ? (
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(claim.correctedAt)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm">
                The linked finding is no longer current, so this offering is
                flagged for review. Its recorded fields are shown as stored —
                they have not been overwritten from the replacement.
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
        </div>
      </details>
    </li>
  );
}
