import type { DashboardSummary } from "@ai-sdr/contracts";

/**
 * View model for one dashboard metric card. Pure derivation from the API
 * summary so the labels/hints can be unit-tested without rendering React.
 */
export interface DashboardCard {
  key: "active-products" | "research-runs" | "leads" | "outreach-drafts";
  label: string;
  value: string;
  hint: string;
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/**
 * Map the summary into the four cards. Every value is a real persisted count;
 * `active` is the product `ACTIVE` lifecycle only, and the flow metrics expose
 * only what the domain actually records (prepared/blocked drafts, completed
 * runs). No commercial metric is invented.
 */
export function buildDashboardCards(summary: DashboardSummary): DashboardCard[] {
  return [
    {
      key: "active-products",
      label: "Active products",
      value: String(summary.products.active),
      hint: `${plural(summary.products.total, "product")} total`,
    },
    {
      key: "research-runs",
      label: "Research runs",
      value: String(summary.researchRuns.total),
      hint: `${summary.researchRuns.completed} completed`,
    },
    {
      key: "leads",
      label: "Leads",
      value: String(summary.leads.total),
      hint: "Evidence-backed candidate buyers",
    },
    {
      key: "outreach-drafts",
      label: "Outreach drafts",
      value: String(summary.outreachDrafts.total),
      hint: `${summary.outreachDrafts.prepared} prepared · ${summary.outreachDrafts.blocked} blocked`,
    },
  ];
}
