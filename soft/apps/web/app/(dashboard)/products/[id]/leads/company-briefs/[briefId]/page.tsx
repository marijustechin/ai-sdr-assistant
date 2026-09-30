import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getCompanyBriefById } from "@entities/company-brief/api";
import { CompanyBriefDocument } from "@features/manage-company-brief";

export const metadata: Metadata = {
  title: "Company brief",
};

/**
 * Dedicated, readable Company Brief page (Account Intelligence). Opened from
 * Outreach Results for a positive handoff. Read/prepare only — Refresh and
 * Request enrichment are the only intelligence actions; no sending or editing.
 */
export default async function CompanyBriefPage({
  params,
}: {
  params: Promise<{ id: string; briefId: string }>;
}) {
  await connection();
  const { id, briefId } = await params;

  let detail = null;
  try {
    detail = await getCompanyBriefById(briefId);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/products/${encodeURIComponent(id)}/leads`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ← Back to Outreach results
        </Link>
      </div>
      <CompanyBriefDocument detail={detail} productId={id} />
    </>
  );
}
