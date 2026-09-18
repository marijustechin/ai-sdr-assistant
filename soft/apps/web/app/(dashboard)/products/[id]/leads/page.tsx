import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { LeadsList } from "@/components/leads/leads-list";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { listOpportunityLeads } from "@/lib/api/leads";
import { getProduct } from "@/lib/api/products";
import { listProductOpportunities } from "@/lib/api/research";
import type { LeadRead } from "@/lib/leads/types";
import type { OpportunityRead } from "@/lib/research/types";

export const metadata: Metadata = {
  title: "Leads",
};

export default async function ProductLeadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  let product: ProductResponse | null = null;
  let opportunities: OpportunityRead[] = [];
  let leadsByOpportunityId = new Map<string, LeadRead[]>();
  let configured = true;
  let loadError: string | null = null;

  try {
    product = await getProduct(id);
    if (product) {
      opportunities = await listProductOpportunities(id);
      const entries = await Promise.all(
        opportunities.map(
          async (opportunity) =>
            [opportunity.id, await listOpportunityLeads(opportunity.id)] as const,
        ),
      );
      leadsByOpportunityId = new Map(entries);
    }
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(
        error,
        "Potential buyers could not be loaded for this product.",
      );
    }
  }

  if (configured && !loadError && product === null) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={product ? `${product.name} — Leads` : "Leads"}
        description="Review potential buyers and shortlist companies for further investigation."
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
        <ProductSectionNav productId={product.id} active="leads" />
      ) : null}

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load potential buyers.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Potential buyers could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : product ? (
        <LeadsList
          productId={product.id}
          opportunities={opportunities}
          leadsByOpportunityId={leadsByOpportunityId}
        />
      ) : null}
    </>
  );
}
