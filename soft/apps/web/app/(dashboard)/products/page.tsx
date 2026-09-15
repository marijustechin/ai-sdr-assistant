import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ProductResponse } from "@ai-sdr/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ProductsTable } from "@/components/products/products-table";
import { buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { listProducts } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "Products",
};

export default async function ProductsPage() {
  // Render per request: the API key and API availability are runtime concerns,
  // not build-time constants.
  await connection();

  let products: ProductResponse[] = [];
  let loadError: string | null = null;
  let configured = true;

  try {
    products = await listProducts();
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(
        error,
        "The product list could not be loaded.",
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="The product catalogue shared across offers, opportunities and research."
        actions={
          <Link href="/products/new" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            New Product
          </Link>
        }
      />

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load products.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Products could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : (
        <ProductsTable products={products} />
      )}
    </>
  );
}
