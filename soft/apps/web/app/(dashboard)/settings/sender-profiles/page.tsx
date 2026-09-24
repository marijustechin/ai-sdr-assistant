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
import { ApiError } from "@shared/api/client";
import { describeApiError } from "@shared/api/errors";
import { listEmailAccounts } from "@entities/email-account/api";
import { listSenderProfiles } from "@entities/sender-profile/api";
import {
  SENDER_PROFILE_STATUS_LABEL,
  SENDER_PROFILE_STATUS_TONE,
  mailboxSummary,
} from "@entities/sender-profile";
import type { SenderProfileRead } from "@entities/sender-profile";

export const metadata: Metadata = {
  title: "Sender profiles",
};

export default async function SenderProfilesPage() {
  await connection();
  let profiles: SenderProfileRead[] = [];
  let accounts: Array<{ id: string; label: string }> = [];
  let configured = true;
  let loadError: string | null = null;
  try {
    profiles = await listSenderProfiles();
  } catch (error) {
    if (error instanceof ApiError && error.code === "api_key_missing") {
      configured = false;
    } else {
      loadError = describeApiError(error, "Sender profiles could not be loaded.");
    }
  }
  try {
    accounts = await listEmailAccounts();
  } catch {
    accounts = [];
  }

  return (
    <>
      <PageHeader
        title="Sender profiles"
        description="Reusable sender identities used when drafting outreach. Assign one to a product to enable drafting."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/settings/email-accounts"
              className={buttonVariants({ variant: "outline" })}
            >
              Email accounts
            </Link>
            <Link href="/settings/sender-profiles/new" className={buttonVariants()}>
              New sender profile
            </Link>
          </div>
        }
      />

      {!configured ? (
        <IntegrationNotice title="API connection is not configured">
          <p>
            Set <code>API_BASE_URL</code> and <code>INTERNAL_API_KEY</code> in the
            web app environment to load sender profiles.
          </p>
        </IntegrationNotice>
      ) : loadError ? (
        <IntegrationNotice title="Sender profiles could not be loaded">
          <p>{loadError}</p>
        </IntegrationNotice>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              No sender profiles yet. Create one to use as the identity for
              outreach drafts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{profile.label}</CardTitle>
                  <Badge tone={SENDER_PROFILE_STATUS_TONE[profile.status]}>
                    {SENDER_PROFILE_STATUS_LABEL[profile.status]}
                  </Badge>
                </div>
                <CardDescription>
                  {[profile.senderName, profile.senderTitle, profile.companyName, profile.fromEmail]
                    .filter((part): part is string => Boolean(part))
                    .join(" · ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {mailboxSummary(profile.emailAccountId, accounts)}
                </span>
                <Link
                  href={`/settings/sender-profiles/${profile.id}`}
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
