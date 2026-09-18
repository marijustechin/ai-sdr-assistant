"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { AlertIcon, CheckCircleIcon } from "@/components/ui/icons";
import { reviewLeadAction } from "@/lib/api/leads-actions";
import type { LeadRead, LeadReviewActionResult, LeadReviewStatus } from "@/lib/leads/types";

export function LeadReviewForm({
  productId,
  lead,
}: {
  productId: string;
  lead: LeadRead;
}) {
  const router = useRouter();
  const [reason, setReason] = useState(lead.reviewReason ?? "");
  const [result, setResult] = useState<LeadReviewActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(reviewStatus: LeadReviewStatus) {
    setSubmitting(true);
    setResult(null);
    try {
      const trimmed = reason.trim();
      const response = await reviewLeadAction(
        productId,
        lead.opportunityId,
        lead.id,
        trimmed.length > 0
          ? { reviewStatus, reviewReason: trimmed }
          : { reviewStatus },
      );
      setResult(response);
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setResult({
        ok: false,
        message: "The review could not be recorded. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review</CardTitle>
        <CardDescription>
          Shortlisting marks a company for further investigation — it does not
          confirm purchasing intent. The reason is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && !result.ok ? (
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-foreground">{result.message}</p>
          </div>
        ) : null}
        {result?.ok ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 p-3 text-sm text-foreground">
            <CheckCircleIcon className="size-5 text-success" />
            Review recorded.
          </div>
        ) : null}

        <FormField
          label="Reason (optional)"
          htmlFor="reviewReason"
          hint="Shown with the candidate; leave empty to clear."
        >
          <Input
            id="reviewReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Holds a confirmed sauna-installer role."
            autoComplete="off"
          />
        </FormField>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="cursor-pointer"
            onClick={() => submit("SHORTLISTED")}
            disabled={submitting || lead.needsReview}
          >
            Shortlist
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => submit("REJECTED")}
            disabled={submitting}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => submit("UNREVIEWED")}
            disabled={submitting}
          >
            Reset to unreviewed
          </Button>
        </div>

        {lead.needsReview ? (
          <p className="text-xs text-destructive">
            The supporting finding was replaced or retracted, so shortlisting is
            blocked until this candidate is re-reviewed.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
