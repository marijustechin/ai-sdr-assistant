-- Additive: shared batch-level outreach message strategy.
--
-- * `outreach_batches.message_strategy` JSON (optional): shared overrides for the
--   subject, proposition, commercial-terms line and CTA. Applying a strategy
--   regenerates only unapproved, non-customized drafts; the evidence-backed
--   personalization is never overridden.
-- No existing data is altered by this migration.
--
-- Manual rollback:
--   ALTER TABLE "outreach_batches" DROP COLUMN "message_strategy";

-- AlterTable
ALTER TABLE "outreach_batches" ADD COLUMN "message_strategy" JSONB;
