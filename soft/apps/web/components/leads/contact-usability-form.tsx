"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateContactUsabilityAction } from "@/lib/api/contacts-actions";
import type { ContactActionResult, ContactRead } from "@/lib/contacts/types";

/**
 * Minimal operator control to set a contact aside as unusable (with an optional
 * reason) or to restore it. The published values and provenance are untouched.
 */
export function ContactUsabilityForm({
  productId,
  opportunityId,
  leadId,
  companyId,
  contact,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  contact: ContactRead;
}) {
  const router = useRouter();
  const [reason, setReason] = useState(contact.unusableReason ?? "");
  const [result, setResult] = useState<ContactActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(usabilityStatus: "USABLE" | "UNUSABLE") {
    setSubmitting(true);
    setResult(null);
    try {
      const trimmed = reason.trim();
      const response = await updateContactUsabilityAction(
        productId,
        opportunityId,
        leadId,
        companyId,
        contact.id,
        usabilityStatus === "UNUSABLE" && trimmed.length > 0
          ? { usabilityStatus, unusableReason: trimmed }
          : { usabilityStatus },
      );
      setResult(response);
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "The contact could not be updated." });
    } finally {
      setSubmitting(false);
    }
  }

  if (contact.usabilityStatus === "UNUSABLE") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => submit("USABLE")}
          disabled={submitting}
        >
          Restore contact
        </Button>
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.message}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional), e.g. address bounced"
          aria-label="Reason for marking the contact unusable"
          className="h-8 max-w-xs text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => submit("UNUSABLE")}
          disabled={submitting}
        >
          Mark unusable
        </Button>
      </div>
      {result && !result.ok ? (
        <p className="text-xs text-destructive">{result.message}</p>
      ) : null}
    </div>
  );
}
