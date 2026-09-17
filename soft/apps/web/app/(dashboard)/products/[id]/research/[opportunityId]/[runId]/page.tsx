import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { BackToTop } from "@/components/research/back-to-top";
import { ClaimsSection } from "@/components/research/claims-section";
import { CoverageSection } from "@/components/research/coverage-section";
import { FollowUpsSection } from "@/components/research/follow-ups-section";
import { OfferingsView } from "@/components/research/offerings-view";
import { ResearchDetails } from "@/components/research/research-details";
import { RunOverview } from "@/components/research/run-overview";
import { RunSummary } from "@/components/research/run-summary";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/api/products";
import {
  getResearchRun,
  listProductOffers,
  listProductOpportunities,
  listRunClaims,
  listRunEvidence,
  listRunOfferings,
} from "@/lib/api/research";
import { parseCheckpoint } from "@/lib/research/checkpoint";
import { buildRunSummary } from "@/lib/research/summary";
import {
  currentClaims,
  filterClaims,
  parseClaimFilters,
} from "@/lib/research/claims";
import { parseOfferingFilters, unlinkedCurrentClaims } from "@/lib/research/offerings";
import { researchIndexPath, researchRunPath } from "@/lib/research/navigation";
import type {
  ClaimRead,
  EvidenceRead,
  OfferRead,
  OfferingRead,
  OpportunityRead,
  ResearchRunDetail,
} from "@/lib/research/types";

export const metadata: Metadata = {
  title: "Research run",
};

export default async function ResearchRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; opportunityId: string; runId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { id, opportunityId, runId } = await params;
  const rawSearchParams = await searchParams;
  const filters = parseClaimFilters(rawSearchParams);
  const offeringFilters = parseOfferingFilters(rawSearchParams);

  let product: ProductResponse | null = null;
  let opportunity: OpportunityRead | null = null;
  let offers: OfferRead[] = [];
  let run: ResearchRunDetail | null = null;
  let evidence: EvidenceRead[] = [];
  let offerings: OfferingRead[] = [];
  let claims: ClaimRead[] = [];
  let configured = true;
  let loadError: string | null = null;

  try {
    product = await getProduct(id);
    const [offerList, opportunityList] = await Promise.all([
      listProductOffers(id),
      listProductOpportunities(id),
    ]);
    offers = offerList;
    opportunity =
      opportunityList.find((item) => item.id === opportunityId) ?? null;
    run = await getResearchRun(opportunityId, runId);
    const [evidenceList, claimList, offeringList] = await Promise.all([
      listRunEvidence(opportunityId, runId),
      // History is always fetched so an offering linked to a corrected claim can
      // be flagged; the current/history separation is enforced when rendering.
      listRunClaims(opportunityId, runId, { includeHistory: true }),
      listRunOfferings(opportunityId, runId),
    ]);
    evidence = evidenceList;
    claims = claimList;
    offerings = offeringList;
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(
        error,
        "This research run could not be loaded.",
      );
    }
  }

  if (configured && !loadError && run === null) {
    notFound();
  }

  const basePath = researchRunPath(id, opportunityId, runId);
  const checkpoint = parseCheckpoint(run?.checkpoint);
  const markets = opportunity?.targetMarkets ?? [];
  const offerName =
    offers.find((offer) => offer.id === opportunity?.offerId)?.name ?? null;
  const current = currentClaims(claims);
  const unlinked = unlinkedCurrentClaims(current, offerings);
  const historyMode = filters.history === true;
  // Run-scoped summary: computed from ALL offerings + full claim history, so the
  // offering filters below never change it.
  const summary = buildRunSummary(offerings, claims, checkpoint);

  return (
    <>
      <PageHeader
        title={opportunity ? opportunity.name : "Research run"}
        description="Who sells what, where and at what price — with provenance and the remaining uncertainty."
        breadcrumb={
          <Link
            href={researchIndexPath(id)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Research
          </Link>
        }
      />

      {product ? (
        <ProductSectionNav productId={product.id} active="research" />
      ) : null}

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load this run.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Run could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : run ? (
        <div className="space-y-4">
          {run.status === "QUEUED" ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Queued — waiting for researcher</p>
              <p className="text-muted-foreground">
                The request is stored and discoverable by the researcher. This is
                the persisted status; partial results appear here as they are
                saved.
              </p>
            </div>
          ) : null}

          <RunOverview
            run={run}
            opportunity={opportunity}
            offerName={offerName}
            markets={markets}
          />

          <RunSummary summary={summary} />

          <OfferingsView
            offerings={offerings}
            claims={claims}
            evidence={evidence}
            filters={offeringFilters}
            claimFilters={filters}
            basePath={basePath}
          />

          <ClaimsSection
            mode="current"
            title="Other current findings"
            description="CURRENT findings that are not linked to a specific offering (market-level or general). They are never discarded; historical claims stay in the correction history."
            claims={filterClaims(unlinked, filters)}
            evidence={evidence}
            filters={filters}
            basePath={basePath}
            preserveOfferingFilters={offeringFilters}
          />

          <ResearchDetails
            notes={checkpoint.notes}
            hasCheckpoint={checkpoint.present}
            queries={run.queries}
          />

          <CoverageSection
            cells={checkpoint.coverage}
            markets={markets}
            hasCheckpoint={checkpoint.present}
          />

          <FollowUpsSection
            followUps={checkpoint.pendingFollowUps}
            hasCheckpoint={checkpoint.present}
          />

          {historyMode ? (
            <ClaimsSection
              mode="history"
              claims={filterClaims(claims, filters)}
              evidence={evidence}
              filters={filters}
              basePath={basePath}
              preserveOfferingFilters={offeringFilters}
            />
          ) : null}

          <BackToTop />
        </div>
      ) : null}
    </>
  );
}
