"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface BatchMessageValues {
  subject: string;
  proposition: string;
  terms: string;
  cta: string;
}

/**
 * Batch-level shared message editor. It makes the "unapplied changes" state
 * visible (the operator has typed something not yet applied). The parent remounts
 * this component (via `key`) when the applied strategy changes, so a successful
 * apply clears the dirty state without an effect.
 */
export function BatchMessageForm({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<void>;
  initial: BatchMessageValues;
}) {
  const [values, setValues] = useState<BatchMessageValues>(initial);

  const dirty =
    values.subject !== initial.subject ||
    values.proposition !== initial.proposition ||
    values.terms !== initial.terms ||
    values.cta !== initial.cta;

  return (
    <form action={action} className="mt-2 space-y-2">
      <label className="block text-xs text-muted-foreground">
        Subject
        <input
          name="subject"
          value={values.subject}
          onChange={(event) =>
            setValues({ ...values, subject: event.target.value })
          }
          className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
      <label className="block text-xs text-muted-foreground">
        Shared proposition / commercial text
        <textarea
          name="proposition"
          rows={2}
          value={values.proposition}
          onChange={(event) =>
            setValues({ ...values, proposition: event.target.value })
          }
          className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
      <label className="block text-xs text-muted-foreground">
        Commercial terms
        <textarea
          name="terms"
          rows={2}
          value={values.terms}
          onChange={(event) =>
            setValues({ ...values, terms: event.target.value })
          }
          className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
      <label className="block text-xs text-muted-foreground">
        Call to action
        <input
          name="cta"
          value={values.cta}
          onChange={(event) => setValues({ ...values, cta: event.target.value })}
          className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
      <p
        className={
          dirty
            ? "text-xs font-medium text-amber-600"
            : "text-xs text-muted-foreground"
        }
      >
        {dirty
          ? "Unapplied changes — click Apply batch message to regenerate the current drafts."
          : "No unapplied changes."}
      </p>
      <Button type="submit" size="sm" className="cursor-pointer">
        Apply batch message
      </Button>
    </form>
  );
}
