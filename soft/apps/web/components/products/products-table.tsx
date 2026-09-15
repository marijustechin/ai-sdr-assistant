import Link from "next/link";
import type { ProductResponse } from "@ai-sdr/contracts";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format";
import { ProductStatusBadge } from "./product-status-badge";

export function ProductsTable({ products }: { products: ProductResponse[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-12 text-center">
                <p className="text-sm font-medium">No products yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the first product to populate this list.
                </p>
                <Link
                  href="/products/new"
                  className={`${buttonVariants({ size: "sm" })} mt-4 inline-flex`}
                >
                  <PlusIcon className="size-4" />
                  New Product
                </Link>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.category ?? "—"}
                </TableCell>
                <TableCell>
                  <ProductStatusBadge status={product.lifecycleStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(product.updatedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/products/${product.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
