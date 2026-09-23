import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmailAccountForm, MailboxVerificationPanel } from "@features/manage-email-account";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ApiError } from "@shared/api/client";
import { describeApiError } from "@shared/api/errors";
import { getEmailAccount } from "@entities/email-account/api";
import type { EmailAccountRead } from "@entities/email-account";

export const metadata: Metadata = {
  title: "Email account",
};

export default async function EmailAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let account: EmailAccountRead | null = null;
  let configured = true;
  let loadError: string | null = null;
  try {
    account = await getEmailAccount(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else if (error instanceof ApiError && error.status === 404) {
      notFound();
    } else {
      loadError = describeApiError(error, "This email account could not be loaded.");
    }
  }
  if (configured && !loadError && account === null) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={account ? account.label : "Email account"}
        description="Edit this mailbox connection. Passwords are never shown."
        breadcrumb={
          <Link
            href="/settings/email-accounts"
            className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeftIcon className="size-3.5" />
            Email accounts
          </Link>
        }
      />
      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>Set the web app environment to load this email account.</p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Email account could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : account ? (
        <div className="max-w-3xl space-y-6">
          <EmailAccountForm mode="edit" accountId={account.id} initial={account} />
          <MailboxVerificationPanel account={account} />
        </div>
      ) : null}
    </>
  );
}
