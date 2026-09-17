import { Badge } from "@/components/ui/badge";
import {
  CLAIM_TYPE_LABEL,
  CLAIM_TYPE_TONE,
  CONFIDENCE_LABEL,
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  STANCE_LABEL,
  STANCE_TONE,
  VERIFICATION_LABEL,
  type Tone,
} from "@/lib/research/claims";
import type {
  ClaimConfidence,
  ClaimEvidenceStance,
  ClaimLifecycleStatus,
  ClaimType,
  EvidenceVerificationStatus,
  ResearchRunPauseReason,
  ResearchRunStatus,
} from "@/lib/research/types";

const RUN_STATUS_LABEL: Record<ResearchRunStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const RUN_STATUS_TONE: Record<ResearchRunStatus, Tone> = {
  QUEUED: "neutral",
  RUNNING: "info",
  PAUSED: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

const PAUSE_REASON_LABEL: Record<ResearchRunPauseReason, string> = {
  BUDGET_EXHAUSTED: "Budget exhausted",
  ACCESS_BLOCKED: "Access blocked",
  CONTEXT_CHANGED: "Context changed",
  DIMINISHING_RETURNS: "Diminishing returns",
  NEEDS_HUMAN: "Needs human",
};

export function RunStatusBadge({ status }: { status: ResearchRunStatus }) {
  return <Badge tone={RUN_STATUS_TONE[status]}>{RUN_STATUS_LABEL[status]}</Badge>;
}

export function PauseReasonBadge({
  reason,
}: {
  reason: ResearchRunPauseReason | null;
}) {
  if (!reason) return null;
  return <Badge tone="warning">{PAUSE_REASON_LABEL[reason]}</Badge>;
}

export function ClaimTypeBadge({ type }: { type: ClaimType }) {
  return <Badge tone={CLAIM_TYPE_TONE[type]}>{CLAIM_TYPE_LABEL[type]}</Badge>;
}

export function ConfidenceBadge({
  confidence,
}: {
  confidence: ClaimConfidence;
}) {
  return (
    <Badge tone="outline">Confidence: {CONFIDENCE_LABEL[confidence]}</Badge>
  );
}

export function LifecycleBadge({
  status,
}: {
  status: ClaimLifecycleStatus;
}) {
  return <Badge tone={LIFECYCLE_TONE[status]}>{LIFECYCLE_LABEL[status]}</Badge>;
}

export function StanceBadge({ stance }: { stance: ClaimEvidenceStance }) {
  return <Badge tone={STANCE_TONE[stance]}>{STANCE_LABEL[stance]}</Badge>;
}

export function VerificationBadge({
  status,
}: {
  status: EvidenceVerificationStatus;
}) {
  return (
    <Badge tone={status === "VERIFIED" ? "success" : "outline"}>
      {VERIFICATION_LABEL[status] ?? status}
    </Badge>
  );
}
