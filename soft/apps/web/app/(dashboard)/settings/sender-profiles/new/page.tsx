import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SenderProfileForm } from "@features/manage-sender-profile";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { listEmailAccounts } from "@entities/email-account/api";
import { accountOptions } from "@entities/email-account";

export const metadata: Metadata = {
  title: "New sender profile",
};

export default async function NewSenderProfilePage() {
  let emailAccounts: Array<{ id: string; label: string; disabled: boolean }> = [];
  try {
    emailAccounts = accountOptions(await listEmailAccounts());
  } catch {
    emailAccounts = [];
  }

  return (
    <>
      <PageHeader
        title="New sender profile"
        description="Create a reusable sender identity. The mailbox connection is optional; credentials live on the email account."
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
      <div className="max-w-3xl">
        <SenderProfileForm mode="create" emailAccounts={emailAccounts} />
      </div>
    </>
  );
}
