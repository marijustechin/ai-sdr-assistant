import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { OpportunityRunsList } from "@/components/research/opportunity-runs";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/api/products";
import {
  listOpportunityRuns,
  listProductOffers,
  listProductOpportunities,
} from "@/lib/api/research";
import type {
  OfferRead,
  OpportunityRead,
  ResearchRunSummary,
} from "@/lib/research/types";

export const metadata: Metadata = {
  title: "Research",
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
  let configured = true;
  let loadError: string | null = null;

  try {
    product = await getProduct(id);
    if (product) {
      const [offerList, opportunityList] = await Promise.all([
        listProductOffers(id),
        listProductOpportunities(id),
      ]);
      offers = offerList;
      opportunities = opportunityList;
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
        "Research runs could not be loaded for this product.",
      );
    }
  }

  if (configured && !loadError && product === null) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={product ? `${product.name} — Research` : "Research"}
        description="Read-only view of persisted research runs. This dashboard never runs research or changes records."
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
            web app environment to load research.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Research could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : product ? (
        <OpportunityRunsList
          productId={product.id}
          opportunities={opportunities}
          runsByOpportunityId={runsByOpportunityId}
          offers={offers}
        />
      ) : null}
    </>
  );
}
