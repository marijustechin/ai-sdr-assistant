import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { InfoIcon, PlusIcon } from "@/components/ui/icons";
import { ApiError } from "@shared/api/client";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { describeApiError } from "@shared/api/errors";
import { buildDashboardCards, type DashboardCard } from "@/lib/dashboard/metrics";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Render per request: the API key and API availability are runtime concerns.
  await connection();

  let cards: DashboardCard[] = [];
  let loadError: string | null = null;
  let configured = true;

  try {
    cards = buildDashboardCards(await getDashboardSummary());
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(error, "The dashboard summary could not be loaded.");
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of the product catalogue, research activity, buyer shortlist and outreach drafts."
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
            web app environment to load dashboard metrics.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Dashboard metrics could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={card.value}
                hint={card.hint}
              />
            ))}
          </div>

          <Card className="mt-6">
            <CardContent className="flex gap-3 p-5 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                Counts reflect persisted records: <strong>Active products</strong>{" "}
                is the product <code>ACTIVE</code> lifecycle only; research runs
                show the completed count; leads are evidence-backed candidate
                buyers; drafts show prepared vs blocked. Sending is not
                implemented, so no delivery or reply metric exists.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
