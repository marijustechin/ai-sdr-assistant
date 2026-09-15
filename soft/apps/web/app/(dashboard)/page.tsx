import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon, PlusIcon } from "@/components/ui/icons";
import { buttonVariants } from "@/components/ui/button";

const STATS = [
  {
    label: "Total products",
    value: "—",
    hint: "Requires GET /products",
  },
  {
    label: "Active products",
    value: "—",
    hint: "Derived from the product lifecycle",
  },
  {
    label: "Archived products",
    value: "—",
    hint: "Derived from the product lifecycle",
  },
  {
    label: "Latest research activity",
    value: "—",
    hint: "Run-scoped; no read endpoint yet",
  },
] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of the product catalogue and research activity."
        actions={
          <Link href="/products/new" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            New Product
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            placeholder
          />
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="flex gap-3 p-5 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            These figures are placeholders: there is no metrics or aggregation
            endpoint yet. Product administration itself is live under{" "}
            <Link href="/products" className="underline underline-offset-4">
              Products
            </Link>
            ; deferred items are tracked in{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              docs/MISSING_API.md
            </code>
            .
          </p>
        </CardContent>
      </Card>
    </>
  );
}
