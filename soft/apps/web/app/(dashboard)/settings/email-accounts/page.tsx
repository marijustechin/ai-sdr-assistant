import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { IntegrationNotice } from "@/components/products/integration-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { listEmailAccounts } from "@/lib/api/email-accounts";
import {
  EMAIL_ACCOUNT_STATUS_LABEL,
  EMAIL_ACCOUNT_STATUS_TONE,
  transportSummary,
} from "@/lib/email-accounts/display";
import type { EmailAccountRead } from "@/lib/email-accounts/types";

export const metadata: Metadata = {
  title: "Email accounts",
};

export default async function EmailAccountsPage() {
  await connection();
  let accounts: EmailAccountRead[] = [];
  let configured = true;
  let loadError: string | null = null;
  try {
    accounts = await listEmailAccounts();
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(error, "Email accounts could not be loaded.");
    }
  }

  return (
    <>
      <PageHeader
        title="Email accounts"
        description="Technical mailbox connections (SMTP sending, IMAP monitoring, later). Sender profiles reference these; no email is sent from here."
        actions={
          <Link href="/settings/email-accounts/new" className={buttonVariants()}>
            New email account
          </Link>
        }
      />

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load email accounts.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Email accounts could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              No email accounts yet. Create one to hold the mailbox connection a
              sender profile can reference.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{account.label}</CardTitle>
                  <Badge tone={EMAIL_ACCOUNT_STATUS_TONE[account.status]}>
                    {EMAIL_ACCOUNT_STATUS_LABEL[account.status]}
                  </Badge>
                </div>
                <CardDescription>
                  {account.accountEmail}
                  {account.provider ? ` · ${account.provider}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {transportSummary(account)}
                </span>
                <Link
                  href={`/settings/email-accounts/${account.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Edit
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
