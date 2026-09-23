"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmailAccountRead } from "@entities/email-account";
import {
  sendTestMessageAction,
  verifyImapAction,
  verifySmtpAction,
} from "./actions";
import {
  errorVerification,
  IDLE_VERIFICATION,
  isVerificationSuccess,
  pendingVerification,
  successVerification,
  verificationButtonView,
  verificationDetail,
  type VerificationState,
} from "./verification-state";

function DetailLine({ state }: { state: VerificationState }) {
  const detail = verificationDetail(state);
  if (!detail) return null;
  return (
    <p
      role="status"
      className={
        isVerificationSuccess(state)
          ? "text-xs text-success"
          : "text-xs text-destructive"
      }
    >
      {detail}
    </p>
  );
}

/**
 * Bounded mailbox verification controls. Each action keeps its own independent
 * state (idle/pending/success/error) so results never bleed between actions; the
 * state is UI-session only and is never persisted. The stored password is never
 * sent to the browser and results carry only a short safe string.
 */
export function MailboxVerificationPanel({
  account,
}: {
  account: EmailAccountRead;
}) {
  const [smtp, setSmtp] = useState<VerificationState>(IDLE_VERIFICATION);
  const [imap, setImap] = useState<VerificationState>(IDLE_VERIFICATION);
  const [send, setSend] = useState<VerificationState>(IDLE_VERIFICATION);
  const [testRecipient, setTestRecipient] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);

  async function runAction(
    setter: (state: VerificationState) => void,
    action: () => Promise<{ ok: boolean; detail: string }>,
  ) {
    setter(pendingVerification());
    try {
      const result = await action();
      setter(
        result.ok
          ? successVerification(result.detail)
          : errorVerification(result.detail),
      );
    } catch {
      setter(errorVerification("The action could not be completed."));
    }
  }

  const smtpButton = verificationButtonView(smtp, "smtp");
  const imapButton = verificationButtonView(imap, "imap");
  const sendButton = verificationButtonView(send, "send");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify mailbox connection</CardTitle>
        <CardDescription>
          Bounded checks that authenticate against your hosting provider. They do
          not send mail (except the explicit test below) and do not read or store
          message content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start gap-6">
          <div className="space-y-1">
            <Button
              type="button"
              variant={smtpButton.variant}
              className={smtpButton.className}
              disabled={smtpButton.disabled}
              onClick={() =>
                runAction(setSmtp, () => verifySmtpAction(account.id))
              }
            >
              {smtpButton.label}
            </Button>
            <DetailLine state={smtp} />
          </div>
          <div className="space-y-1">
            <Button
              type="button"
              variant={imapButton.variant}
              className={imapButton.className}
              disabled={imapButton.disabled}
              onClick={() =>
                runAction(setImap, () => verifyImapAction(account.id))
              }
            >
              {imapButton.label}
            </Button>
            <DetailLine state={imap} />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Send one controlled test message</p>
          <p className="text-xs text-muted-foreground">
            Sends exactly one message from this mailbox to the address below. Only
            use an address you control.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="recipient@example.com"
              autoComplete="off"
              className="max-w-xs"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={confirmSend}
                onChange={(e) => setConfirmSend(e.target.checked)}
              />
              I confirm this single test send
            </label>
            <Button
              type="button"
              variant={sendButton.variant}
              className={sendButton.className}
              disabled={
                sendButton.disabled ||
                !confirmSend ||
                testRecipient.trim().length === 0
              }
              onClick={() =>
                runAction(setSend, () =>
                  sendTestMessageAction(account.id, testRecipient.trim()),
                )
              }
            >
              {sendButton.label}
            </Button>
          </div>
          <DetailLine state={send} />
        </div>
      </CardContent>
    </Card>
  );
}
