import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { NewRequestForm } from "@/components/research/new-request-form";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/api/products";
import { researchIndexPath } from "@/lib/research/navigation";

export const metadata: Metadata = {
  title: "New market research",
};

export default async function NewMarketResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  let product: ProductResponse | null = null;
  let configured = true;
  let loadError: string | null = null;

  try {
    product = await getProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(error, "This product could not be loaded.");
    }
  }

  if (configured && !loadError && product === null) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={product ? `New market research — ${product.name}` : "New market research"}
        description="Configure a market research request for this product. Submitting stores it as queued; it does not start research automatically."
        breadcrumb={
          <Link
            href={product ? researchIndexPath(product.id) : "/products"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            {product ? `${product.name} — Market research` : "Products"}
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
            web app environment to submit a research request.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Product could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : product ? (
        <NewRequestForm
          productId={product.id}
          productName={product.name}
          productCategory={product.category}
          productScientificName={product.scientificName}
        />
      ) : null}
    </>
  );
}
