import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { researchIndexPath } from "@/lib/research/navigation";

const PLANNED_SECTIONS = [
  { id: "leads", label: "Leads" },
  { id: "history", label: "History" },
] as const;

/**
 * Section navigation for the product detail page. Overview and Research are
 * implemented; Leads and History are shown as planned so the page structure is
 * stable when those modules arrive.
 */
export function ProductSectionNav({
  productId,
  active,
}: {
  productId: string;
  active: "overview" | "research";
}) {
  const sections = [
    { id: "overview", label: "Overview", href: `/products/${encodeURIComponent(productId)}` },
    {
      id: "research",
      label: "Research",
      href: researchIndexPath(productId),
    },
  ] as const;

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-1 border-b border-border"
      role="tablist"
      aria-label="Product sections"
    >
      {sections.map((section) =>
        active === section.id ? (
          <span
            key={section.id}
            role="tab"
            aria-selected="true"
            className="-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
          >
            {section.label}
          </span>
        ) : (
          <Link
            key={section.id}
            href={section.href}
            role="tab"
            aria-selected="false"
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
            )}
          >
            {section.label}
          </Link>
        ),
      )}
      {PLANNED_SECTIONS.map((section) => (
        <span
          key={section.id}
          aria-disabled="true"
          className="-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground/70"
        >
          {section.label}
          <Badge tone="outline">Planned</Badge>
        </span>
      ))}
    </div>
  );
}
