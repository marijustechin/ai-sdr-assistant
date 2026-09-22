import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductResponse } from "@ai-sdr/contracts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadReviewForm } from "@/components/leads/lead-review-form";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { ContactList } from "@/components/leads/contact-list";
import { OutreachDraftList } from "@/components/leads/outreach-draft-list";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { AlertIcon, ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { listCompanyContacts } from "@/lib/api/contacts";
import { listOutreachDrafts } from "@/lib/api/outreach";
import { getLead } from "@/lib/api/leads";
import { getProduct } from "@/lib/api/products";
import { formatDateTime } from "@/lib/format";
import { claimLifecycleLabel, leadRoleLabel } from "@/lib/leads/display";
import {
  AGENT_QUALIFICATION_TONE,
  agentQualificationLabel,
} from "@/lib/leads/display";
import type { ContactRead } from "@/lib/contacts/types";
import type { OutreachDraftRead } from "@/lib/outreach/types";
import type { LeadRead } from "@/lib/leads/types";

export const metadata: Metadata = {
  title: "Lead",
};

function CorrectionWarning({ lead }: { lead: LeadRead }) {
  if (!lead.needsReview) return null;
  const reason =
    lead.claim?.lifecycleStatus === "RETRACTED"
      ? "The linked finding was retracted"
      : "The linked finding was replaced";
  return (
    <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <AlertIcon className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
      <p className="text-foreground">
        {reason}, so this candidate needs re-review before it can be shortlisted.
      </p>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string; opportunityId: string; leadId: string }>;
}) {
  const { id, opportunityId, leadId } = await params;

  let product: ProductResponse | null = null;
  let lead: LeadRead | null = null;
  let contacts: ContactRead[] = [];
  let contactsUnavailable = false;
  let drafts: OutreachDraftRead[] = [];
  let draftsUnavailable = false;
  let configured = true;
  let loadError: string | null = null;

  try {
    product = await getProduct(id);
    lead = await getLead(opportunityId, leadId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else if (error instanceof ApiError && error.status === 404) {
      notFound();
    } else {
      loadError = describeApiError(error, "This candidate could not be loaded.");
    }
  }

  if (lead) {
    try {
      contacts = await listCompanyContacts(lead.company.id);
    } catch {
      contactsUnavailable = true;
    }
    try {
      drafts = await listOutreachDrafts(opportunityId, leadId);
    } catch {
      draftsUnavailable = true;
    }
  }

  if (configured && !loadError && (product === null || lead === null)) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={lead?.company.name ?? "Lead"}
        description="Inspect this potential buyer, the agent's qualification, and its contacts."
        breadcrumb={
          <Link
            href={product ? `/products/${product.id}/leads` : "/products"}
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeftIcon className="size-3.5" />
            {product ? `${product.name} — Leads` : "Leads"}
          </Link>
        }
      />

      {product ? (
        <ProductSectionNav productId={product.id} active="leads" />
      ) : null}

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load this candidate.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Candidate could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : lead && product ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <LeadStatusBadge status={lead.reviewStatus} />
            {lead.needsReview ? <Badge tone="warning">Needs review</Badge> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{lead.company.name}</p>
                <p className="text-muted-foreground">
                  {lead.company.country ?? "Country: unknown"}
                </p>
                {lead.company.website ? (
                  <a
                    href={lead.company.website}
                    className="rounded text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {lead.company.website}
                  </a>
                ) : (
                  <p className="text-muted-foreground">Website: unknown</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lead.observedRoles.map((role) => (
                    <Badge key={role} tone="outline">
                      {leadRoleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observed business activity</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground">
                {lead.observedActivityText}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Why this company?</CardTitle>
              <CardDescription>
                A hypothesis for review. Shortlisting selects a company for
                further investigation — it does not confirm purchasing intent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-foreground">{lead.buyerFitHypothesisText}</p>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  What we still need to know
                </p>
                <p className="text-muted-foreground">
                  {lead.unknownsText ?? "Not recorded."}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Next step
                </p>
                <p className="text-muted-foreground">
                  {lead.nextVerificationStepText ?? "Not recorded."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent qualification</CardTitle>
              <CardDescription>
                The agent&apos;s assessment against documented, evidence-backed
                criteria — separate from human review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    lead.agentQualificationStale
                      ? "warning"
                      : AGENT_QUALIFICATION_TONE[lead.agentQualificationStatus]
                  }
                >
                  {lead.agentQualificationStale
                    ? "Needs reassessment"
                    : agentQualificationLabel(lead.agentQualificationStatus)}
                </Badge>
                {lead.agentAssessedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Assessed {formatDateTime(lead.agentAssessedAt)}
                  </span>
                ) : null}
              </div>
              {lead.agentQualificationStale ? (
                <p className="text-xs text-destructive">
                  The supporting finding was replaced or retracted; reassessment
                  is required before this candidate can progress.
                </p>
              ) : null}
              <p className="text-muted-foreground">
                {lead.agentQualificationReason ?? "No assessment recorded."}
              </p>
              <p className="text-xs text-muted-foreground">
                {lead.eligibleForContactDiscovery
                  ? "Eligible for contact discovery."
                  : "Not currently eligible for contact discovery."}
              </p>
            </CardContent>
          </Card>

          <LeadReviewForm productId={product.id} lead={lead} />

          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <CorrectionWarning lead={lead} />

              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {(lead.evidence.source.title ?? "Source") +
                    (lead.evidence.source.publisher
                      ? ` · ${lead.evidence.source.publisher}`
                      : "")}
                </p>
                <a
                  href={lead.evidence.source.url}
                  className="break-all rounded text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  target="_blank"
                  rel="noreferrer"
                >
                  {lead.evidence.source.url}
                </a>
                <p className="text-xs text-muted-foreground">
                  Retrieved {formatDateTime(lead.evidence.retrievedAt)} ·{" "}
                  {lead.evidence.verificationStatus}
                </p>
              </div>

              <details className="group">
                <summary className="cursor-pointer rounded text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  View evidence
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-muted-foreground">
                    {lead.evidence.evidenceText}
                  </p>
                  {lead.claim ? (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        Linked finding · {lead.claim.type}/{lead.claim.confidence} ·{" "}
                        {claimLifecycleLabel(lead.claim.lifecycleStatus)}
                      </p>
                      <p className="mt-1 text-foreground">
                        {lead.claim.statement}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No supporting finding linked.
                    </p>
                  )}
                </div>
              </details>
            </CardContent>
          </Card>

          {lead.reviewStatus !== "UNREVIEWED" || lead.reviewReason ? (
            <Card>
              <CardHeader>
                <CardTitle>Review decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <LeadStatusBadge status={lead.reviewStatus} />
                  <span className="text-xs text-muted-foreground">
                    {lead.reviewedAt
                      ? `Reviewed ${formatDateTime(lead.reviewedAt)}`
                      : ""}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {lead.reviewReason ?? "No reason recorded."}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <ContactList
            productId={product.id}
            opportunityId={opportunityId}
            leadId={lead.id}
            companyId={lead.company.id}
            contacts={contacts}
            unavailable={contactsUnavailable}
          />

          <OutreachDraftList
            productId={product.id}
            drafts={drafts}
            unavailable={draftsUnavailable}
          />
        </div>
      ) : null}
    </>
  );
}
