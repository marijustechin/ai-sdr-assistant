import { OutreachDraftList } from "@entities/outreach-draft";
import type { OutreachDraftRead } from "@entities/outreach-draft";
import { OutreachDraftEditor } from "./editor";

/**
 * The lead's outreach review surface: a compact editor for the current
 * materialized draft (when it is a prepared, reviewable version) above the
 * read-only draft history. Editing is not sending.
 */
export function OutreachDraftReview({
  productId,
  opportunityId,
  leadId,
  drafts,
  unavailable = false,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  drafts: OutreachDraftRead[];
  unavailable?: boolean;
}) {
  const current: OutreachDraftRead | null = drafts[0] ?? null;
  const editable =
    current &&
    current.preparationStatus === "PREPARED" &&
    current.canonicalBody
      ? current
      : null;

  return (
    <div className="space-y-4">
      {editable ? (
        <OutreachDraftEditor
          productId={productId}
          opportunityId={opportunityId}
          leadId={leadId}
          draft={editable}
        />
      ) : null}
      <OutreachDraftList
        productId={productId}
        drafts={drafts}
        unavailable={unavailable}
      />
    </div>
  );
}
