-- Additive: outreach batch sending (DB-backed queue, pacing, Sent-copy tracking).
--
-- * `OutreachBatchStatus` gains `FAILED`.
-- * New enums `OutreachOutboundStatus` (QUEUED/SENDING/SENT/FAILED/CANCELLED)
--   and `OutreachSentCopyStatus` (PENDING/APPENDED/FAILED).
-- * `outreach_batches` gains `paused`, `pacing_seconds`, `started_at`.
-- * New `outreach_outbound_messages` (owner `outreach-sender`): one immutable
--   outbound per approved draft version (`draft_id` unique → SMTP at most once),
--   with DB-backed pacing (`next_eligible_at`), CAS lease (`locked_until`),
--   SMTP state (`smtp_submitted_at`, `provider_message_id`, `message_id` unique),
--   and independent Sent-copy state.
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   ALTER TABLE "outreach_batches" DROP COLUMN "started_at", DROP COLUMN "pacing_seconds", DROP COLUMN "paused";
--   DROP TABLE "outreach_outbound_messages";
--   DROP TYPE "OutreachSentCopyStatus";
--   DROP TYPE "OutreachOutboundStatus";
--   -- enum value 'FAILED' cannot be removed in place.

-- AlterEnum
ALTER TYPE "OutreachBatchStatus" ADD VALUE 'FAILED';

-- CreateEnum
CREATE TYPE "OutreachOutboundStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachSentCopyStatus" AS ENUM ('PENDING', 'APPENDED', 'FAILED');

-- AlterTable
ALTER TABLE "outreach_batches"
ADD COLUMN "paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pacing_seconds" INTEGER,
ADD COLUMN "started_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "outreach_outbound_messages" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "email_account_id" UUID,
    "sender_profile_id" UUID,
    "recipient_email" VARCHAR(320) NOT NULL,
    "from_email" VARCHAR(320) NOT NULL,
    "reply_to_email" VARCHAR(320),
    "subject" VARCHAR(512) NOT NULL,
    "text_body" TEXT NOT NULL,
    "html_body" TEXT,
    "language" VARCHAR(35) NOT NULL,
    "status" "OutreachOutboundStatus" NOT NULL DEFAULT 'QUEUED',
    "queued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_eligible_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "smtp_submitted_at" TIMESTAMPTZ(6),
    "message_id" VARCHAR(512) NOT NULL,
    "provider_message_id" VARCHAR(512),
    "failure_code" VARCHAR(64),
    "sent_copy_status" "OutreachSentCopyStatus" NOT NULL DEFAULT 'PENDING',
    "sent_copy_attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_copy_error" VARCHAR(120),
    "sent_copy_appended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outreach_outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outreach_outbound_messages_draft_id_key" ON "outreach_outbound_messages"("draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_outbound_messages_message_id_key" ON "outreach_outbound_messages"("message_id");

-- CreateIndex
CREATE INDEX "outreach_outbound_messages_status_next_eligible_at_idx" ON "outreach_outbound_messages"("status", "next_eligible_at");

-- CreateIndex
CREATE INDEX "outreach_outbound_messages_batch_id_idx" ON "outreach_outbound_messages"("batch_id");

-- CreateIndex
CREATE INDEX "outreach_outbound_messages_email_account_id_idx" ON "outreach_outbound_messages"("email_account_id");

-- AddForeignKey
ALTER TABLE "outreach_outbound_messages" ADD CONSTRAINT "outreach_outbound_messages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "outreach_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
