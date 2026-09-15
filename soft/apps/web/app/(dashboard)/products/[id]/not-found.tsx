import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductNotFound() {
  return (
    <Card>
      <CardContent className="space-y-3 p-8 text-center">
        <p className="text-base font-semibold">Product not found</p>
        <p className="text-sm text-muted-foreground">
          This product may have been removed, or the link is incorrect.
        </p>
        <Link
          href="/products"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to products
        </Link>
      </CardContent>
    </Card>
  );
}
