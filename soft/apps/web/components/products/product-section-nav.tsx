import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  { id: "overview", label: "Overview", implemented: true },
  { id: "research", label: "Research", implemented: false },
  { id: "leads", label: "Leads", implemented: false },
  { id: "history", label: "History", implemented: false },
] as const;

/**
 * Section navigation for the product detail page. Only Overview exists today;
 * the remaining sections are shown as planned so the page structure is stable
 * when those modules arrive.
 */
export function ProductSectionNav() {
  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-1 border-b border-border"
      role="tablist"
      aria-label="Product sections"
    >
      {SECTIONS.map((section) =>
        section.implemented ? (
          <span
            key={section.id}
            role="tab"
            aria-selected="true"
            className="-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
          >
            {section.label}
          </span>
        ) : (
          <span
            key={section.id}
            aria-disabled="true"
            className="-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground/70"
          >
            {section.label}
            <Badge tone="outline">Planned</Badge>
          </span>
        ),
      )}
    </div>
  );
}
