-- Agent qualification of a potential-buyer candidate, separate from operator
-- review. Automation-first direction (O-020 correction): contact discovery and
-- later preparation must not require a human shortlist; the agent qualifies
-- candidates against documented, evidence-backed criteria, while an explicit
-- operator REJECTED always wins. These columns never touch `review_*`.
--
-- Additive and reversible; existing rows default to `NOT_ASSESSED`.
-- Owner: `lead-discoverer`.
-- Rollback:
--   ALTER TABLE "opportunity_companies"
--     DROP COLUMN "agent_assessed_at",
--     DROP COLUMN "agent_qualification_reason",
--     DROP COLUMN "agent_qualification_status";
--   DROP TYPE "AgentQualificationStatus";

-- CreateEnum
CREATE TYPE "AgentQualificationStatus" AS ENUM ('NOT_ASSESSED', 'QUALIFIED', 'NEEDS_MORE_EVIDENCE', 'DISQUALIFIED');

-- AlterTable
ALTER TABLE "opportunity_companies"
  ADD COLUMN "agent_qualification_status" "AgentQualificationStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
  ADD COLUMN "agent_qualification_reason" TEXT,
  ADD COLUMN "agent_assessed_at" TIMESTAMPTZ(6);
