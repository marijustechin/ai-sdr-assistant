import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { OpportunityRunsList } from "@/components/research/opportunity-runs";
import { ResearchRequestsList } from "@/components/research/research-requests-list";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@shared/api/client";
import { describeApiError } from "@shared/api/errors";
import { getProduct } from "@/lib/api/products";
import {
  listOpportunityRuns,
  listProductOffers,
  listProductOpportunities,
} from "@/lib/api/research";
import { listQueuedResearchRequests } from "@/lib/api/research-requests";
import type {
  OfferRead,
  OpportunityRead,
  ResearchRunSummary,
} from "@/lib/research/types";
import type { ResearchRequestSummary } from "@/lib/research-requests/types";

export const metadata: Metadata = {
  title: "Market research",
};

export default async function ProductResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  let product: ProductResponse | null = null;
  let offers: OfferRead[] = [];
  let opportunities: OpportunityRead[] = [];
  let runsByOpportunityId = new Map<string, ResearchRunSummary[]>();
  let queuedRequests: ResearchRequestSummary[] = [];
  let configured = true;
  let loadError: string | null = null;

  try {
    product = await getProduct(id);
    if (product) {
      const [offerList, opportunityList, queued] = await Promise.all([
        listProductOffers(id),
        listProductOpportunities(id),
        listQueuedResearchRequests(),
      ]);
      offers = offerList;
      opportunities = opportunityList;
      queuedRequests = queued.filter((request) => request.productId === id);
      const runs = await Promise.all(
        opportunityList.map(async (opportunity) => [
          opportunity.id,
          await listOpportunityRuns(opportunity.id),
        ] as const),
      );
      runsByOpportunityId = new Map(runs);
    }
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(
        error,
        "Research requests could not be loaded for this product.",
      );
    }
  }

  if (configured && !loadError && product === null) {
    notFound();
  }

  const newRequestPath = `/products/${encodeURIComponent(id)}/research/new`;

  return (
    <>
      <PageHeader
        title={product ? `${product.name} — Market research` : "Market research"}
        description="Submit a market research request and track its status. This dashboard never runs research and never changes records."
        breadcrumb={
          <Link
            href={product ? `/products/${product.id}` : "/products"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            {product ? product.name : "Products"}
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
            web app environment to load market research.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Market research could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : product ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Configure a market research request for this product; submitting
              stores it as queued for a researcher.
            </p>
            <Link href={newRequestPath} className={buttonVariants()}>
              New market research
            </Link>
          </div>

          <ResearchRequestsList
            productId={product.id}
            requests={queuedRequests}
          />

          {opportunities.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                No market research yet for this product. Submit a request; it will
                appear here as queued until a researcher picks it up.
              </p>
              <Link
                href={newRequestPath}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-3",
                })}
              >
                New market research
              </Link>
            </div>
          ) : (
            <OpportunityRunsList
              productId={product.id}
              opportunities={opportunities}
              runsByOpportunityId={runsByOpportunityId}
              offers={offers}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
