import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SenderProfileForm } from "@features/manage-sender-profile";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@shared/api/client";
import { describeApiError } from "@shared/api/errors";
import { listEmailAccounts } from "@entities/email-account/api";
import { getSenderProfile } from "@entities/sender-profile/api";
import { accountOptions } from "@entities/email-account";
import type { SenderProfileRead } from "@entities/sender-profile";

export const metadata: Metadata = {
  title: "Sender profile",
};

export default async function SenderProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let profile: SenderProfileRead | null = null;
  let emailAccounts: Array<{ id: string; label: string; disabled: boolean }> = [];
  let configured = true;
  let loadError: string | null = null;
  try {
    profile = await getSenderProfile(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else if (error instanceof ApiError && error.status === 404) {
      notFound();
    } else {
      loadError = describeApiError(error, "This sender profile could not be loaded.");
    }
  }
  if (configured && !loadError && profile === null) {
    notFound();
  }
  try {
    emailAccounts = accountOptions(await listEmailAccounts());
  } catch {
    emailAccounts = [];
  }

  return (
    <>
      <PageHeader
        title={profile ? profile.label : "Sender profile"}
        description="Edit this reusable sender identity. The mailbox connection is a reference — credentials are never shown here."
        breadcrumb={
          <Link
            href="/settings/sender-profiles"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeftIcon className="size-3.5" />
            Sender profiles
          </Link>
        }
      />
      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>Set the web app environment to load this sender profile.</p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Sender profile could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : profile ? (
        <div className="max-w-3xl">
          <SenderProfileForm
            mode="edit"
            profileId={profile.id}
            initial={profile}
            emailAccounts={emailAccounts}
          />
        </div>
      ) : null}
    </>
  );
}
