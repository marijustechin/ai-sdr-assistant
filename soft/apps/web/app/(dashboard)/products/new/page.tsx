import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductForm } from "@/components/products/product-form";
import { ArrowLeftIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "New product",
};

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="New product"
        description="Register a product in the catalogue. Fields map directly to the POST /products contract."
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
      <div className="max-w-3xl">
        <ProductForm mode="create" />
      </div>
    </>
  );
}
