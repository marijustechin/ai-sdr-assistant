import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductForm } from "@/components/products/product-form";
import { ProductSectionNav } from "@/components/products/product-section-nav";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/api/products";
import { formatDateTime } from "@/lib/format";
import { productResponseToFormValues } from "@/lib/products/mappers";

export const metadata: Metadata = {
  title: "Product",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product: ProductResponse | null = null;
  let loadError: string | null = null;
  let configured = true;

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
        title={product?.name ?? "Product"}
        description="Core product record. Sections beyond Overview are planned."
        breadcrumb={
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Products
          </Link>
        }
      />

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load this product.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Product could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : null}

      {product ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status</span>
              <ProductStatusBadge status={product.lifecycleStatus} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Updated</span>
              <span>{formatDateTime(product.updatedAt)}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {product.id}
            </span>
          </div>

          <ProductSectionNav />

          <div className="max-w-3xl">
            <ProductForm
              mode="edit"
              productId={product.id}
              initialValues={productResponseToFormValues(product)}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
