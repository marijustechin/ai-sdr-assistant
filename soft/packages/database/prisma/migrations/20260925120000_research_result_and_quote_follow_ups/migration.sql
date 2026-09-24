-- Additive: Research Result Finalization + DB-backed pending-quote follow-up
-- scheduling.
--
-- * ResearchRunStatus gains COMPLETED_WITH_PENDING_CLARIFICATIONS (a run can be
--   finalized/published while supplier RFQs are still awaiting replies).
-- * PriceInquiryStatus gains NO_RESPONSE (waiting window elapsed, no reply;
--   no longer pending, outbound/inquiry records preserved).
-- * New tables: research_results (owner market-researcher),
--   quote_follow_ups (owner quote-collection).
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   DROP TABLE "quote_follow_ups";
--   DROP TABLE "research_results";
--   DROP TYPE "QuoteFollowUpStatus";
--   -- enum values cannot be removed in place; recreate the types with the
--   -- prior value lists once no row uses the new values.

-- AlterEnum
ALTER TYPE "ResearchRunStatus" ADD VALUE 'COMPLETED_WITH_PENDING_CLARIFICATIONS';

-- AlterEnum
ALTER TYPE "PriceInquiryStatus" ADD VALUE 'NO_RESPONSE';

-- CreateEnum
CREATE TYPE "QuoteFollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "research_results" (
    "id" UUID NOT NULL,
    "research_run_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "research_completed_at" TIMESTAMPTZ(6) NOT NULL,
    "last_enriched_at" TIMESTAMPTZ(6) NOT NULL,
    "frozen_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "research_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_results_research_run_id_key" ON "research_results"("research_run_id");

-- CreateIndex
CREATE INDEX "research_results_opportunity_id_idx" ON "research_results"("opportunity_id");

-- CreateTable
CREATE TABLE "quote_follow_ups" (
    "id" UUID NOT NULL,
    "price_inquiry_draft_id" UUID NOT NULL,
    "outbound_message_id" UUID,
    "email_account_id" UUID,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "status" "QuoteFollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_check_at" TIMESTAMPTZ(6) NOT NULL,
    "last_checked_at" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "last_result" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quote_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_follow_ups_price_inquiry_draft_id_key" ON "quote_follow_ups"("price_inquiry_draft_id");

-- CreateIndex
CREATE INDEX "quote_follow_ups_status_next_check_at_idx" ON "quote_follow_ups"("status", "next_check_at");

-- CreateIndex
CREATE INDEX "quote_follow_ups_opportunity_id_idx" ON "quote_follow_ups"("opportunity_id");

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_follow_ups" ADD CONSTRAINT "quote_follow_ups_price_inquiry_draft_id_fkey" FOREIGN KEY ("price_inquiry_draft_id") REFERENCES "price_inquiry_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
