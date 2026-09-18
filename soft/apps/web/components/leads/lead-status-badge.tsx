import { Badge } from "@/components/ui/badge";
import {
  LEAD_REVIEW_STATUS_LABEL,
  LEAD_REVIEW_STATUS_TONE,
} from "@/lib/leads/display";
import type { LeadReviewStatus } from "@/lib/leads/types";

export function LeadStatusBadge({ status }: { status: LeadReviewStatus }) {
  return (
    <Badge tone={LEAD_REVIEW_STATUS_TONE[status]}>
      {LEAD_REVIEW_STATUS_LABEL[status]}
    </Badge>
  );
}
