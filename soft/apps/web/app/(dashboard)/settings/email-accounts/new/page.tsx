import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmailAccountForm } from "@/components/email-accounts/email-account-form";
import { ArrowLeftIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "New email account",
};

export default function NewEmailAccountPage() {
  return (
    <>
      <PageHeader
        title="New email account"
        description="Configure a mailbox connection. SMTP and IMAP are stored for later use only; no email is sent and no mailbox is read."
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
      <div className="max-w-3xl">
        <EmailAccountForm mode="create" />
      </div>
    </>
  );
}
