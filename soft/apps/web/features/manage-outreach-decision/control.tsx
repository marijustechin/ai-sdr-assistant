"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  OUTREACH_DECISION_LABEL,
  OUTREACH_DECISION_TONE,
  type OutreachDecisionRead,
  type OutreachDecisionStatus,
} from "@entities/outreach-draft";
import { formatDateTime } from "@shared/lib/format";
import {
  loadOfferingDecisionAction,
  setOutreachDecisionForCompanyAction,
  setOutreachDecisionForOfferingAction,
} from "./actions";

const DECISIONS: OutreachDecisionStatus[] = [
  "ELIGIBLE",
  "DO_NOT_CONTACT",
  "EXISTING_RELATIONSHIP",
  "NOT_RELEVANT",
  "ALREADY_CONTACTED",
];

export type OutreachDecisionScope =
  | {
      kind: "company";
      companyId: string;
      productId: string;
      initialDecision: OutreachDecisionRead | null;
    }
  | { kind: "offering"; offeringId: string };

/**
 * Compact, human-controlled outreach decision for one (opportunity, company)
 * scope. The offering scope resolves the offering's company (so it works before
 * any lead exists); both scopes read/write the same authoritative record. It
 * never changes research evidence or the agent qualification.
 */
export function OutreachDecisionControl({
  opportunityId,
  scope,
}: {
  opportunityId: string;
  scope: OutreachDecisionScope;
}) {
  const router = useRouter();
  const initial = scope.kind === "company" ? scope.initialDecision : null;
  const offeringId = scope.kind === "offering" ? scope.offeringId : null;
  const [current, setCurrent] = useState<OutreachDecisionRead | null>(initial);
  const [decision, setDecision] = useState<OutreachDecisionStatus>(
    initial?.decision ?? "ELIGIBLE",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [loading, setLoading] = useState(offeringId !== null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (offeringId === null) return;
    let active = true;
    void (async () => {
      const loaded = await loadOfferingDecisionAction(
        opportunityId,
        offeringId,
      );
      if (!active) return;
      setCurrent(loaded);
      setDecision(loaded?.decision ?? "ELIGIBLE");
      setNote(loaded?.note ?? "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [opportunityId, offeringId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const trimmed = note.trim();
      const values =
        trimmed.length > 0 ? { decision, note: trimmed } : { decision };
      const result =
        scope.kind === "company"
          ? await setOutreachDecisionForCompanyAction(
              scope.productId,
              opportunityId,
              scope.companyId,
              values,
            )
          : await setOutreachDecisionForOfferingAction(
              opportunityId,
              scope.offeringId,
              values,
            );
      if (result.ok) {
        setCurrent(result.decision ?? null);
        setMessage("Outreach decision saved.");
        router.refresh();
      } else {
        setError(result.message ?? "The outreach decision could not be saved.");
      }
    } catch {
      setError("The outreach decision could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Outreach decision</span>
        <Badge tone={OUTREACH_DECISION_TONE[decision]}>
          {OUTREACH_DECISION_LABEL[decision]}
        </Badge>
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : current ? (
          <span className="text-xs text-muted-foreground">
            Human decision · {formatDateTime(current.decidedAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            No human decision recorded (treated as eligible)
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        A human exclusion prevents outreach drafting for this product/opportunity
        even when the agent qualified the company. Research evidence and the
        company&apos;s presence in results are not changed.
      </p>

      <form onSubmit={submit} className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Outreach decision"
            value={decision}
            onChange={(e) =>
              setDecision(e.target.value as OutreachDecisionStatus)
            }
            className="max-w-xs"
            disabled={loading}
          >
            {DECISIONS.map((value) => (
              <option key={value} value={value}>
                {OUTREACH_DECISION_LABEL[value]}
              </option>
            ))}
          </Select>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional reason / note"
            className="max-w-xs"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={submitting || loading}
            className="cursor-pointer"
          >
            {submitting ? "Saving…" : "Save decision"}
          </Button>
        </div>
        {message ? <p className="text-xs text-success">{message}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </form>
    </div>
  );
}
