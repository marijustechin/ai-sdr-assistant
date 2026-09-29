-- Additive: batch/campaign outreach review model.
--
-- * New `outreach_batches` (owner `outreach-drafter`): a whole-batch review unit
--   for one opportunity scope (optional target market + sender profile + language).
--   `status` includes APPROVED/QUEUED/SENDING/SENT for a future controlled-pacing
--   send worker (none implemented here). `send_policy` is reserved for pacing /
--   rate-limit config and is unused today.
-- * `outreach_drafts` gains `batch_id`, `customized`, `approval_status`,
--   `approved_at`. Approval is per immutable version: a later revision is a new
--   row with PENDING, so it requires re-approval before it is part of an approved
--   batch.
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   ALTER TABLE "outreach_drafts" DROP CONSTRAINT "outreach_drafts_batch_id_fkey";
--   DROP INDEX "outreach_drafts_batch_id_idx";
--   ALTER TABLE "outreach_drafts" DROP COLUMN "approved_at", DROP COLUMN "approval_status", DROP COLUMN "customized", DROP COLUMN "batch_id";
--   DROP TABLE "outreach_batches";
--   DROP TYPE "OutreachApprovalStatus";
--   DROP TYPE "OutreachBatchStatus";

-- CreateEnum
CREATE TYPE "OutreachBatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'QUEUED', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachApprovalStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "outreach_batches" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "target_market_id" UUID,
    "sender_profile_id" UUID,
    "language" VARCHAR(35) NOT NULL,
    "status" "OutreachBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_kind" "OutreachDecisionSource" NOT NULL DEFAULT 'HUMAN',
    "approved_at" TIMESTAMPTZ(6),
    "send_policy" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outreach_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_batches_opportunity_id_idx" ON "outreach_batches"("opportunity_id");

-- AddForeignKey
ALTER TABLE "outreach_batches" ADD CONSTRAINT "outreach_batches_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_batches" ADD CONSTRAINT "outreach_batches_target_market_id_fkey" FOREIGN KEY ("target_market_id") REFERENCES "target_markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_batches" ADD CONSTRAINT "outreach_batches_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "sender_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "outreach_drafts"
ADD COLUMN "batch_id" UUID,
ADD COLUMN "customized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approval_status" "OutreachApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "approved_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "outreach_drafts_batch_id_idx" ON "outreach_drafts"("batch_id");

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "outreach_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
