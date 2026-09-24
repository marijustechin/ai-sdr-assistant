-- Additive: company/brand becomes optional on a sender profile, and an optional
-- role/title is introduced (used for the RFQ closing). Existing profiles keep
-- their company/brand; nothing is removed or backfilled.
--
-- Manual rollback:
--   ALTER TABLE "sender_profiles" DROP COLUMN "sender_title";
--   UPDATE "sender_profiles" SET "company_name" = '' WHERE "company_name" IS NULL;
--   ALTER TABLE "sender_profiles" ALTER COLUMN "company_name" SET NOT NULL;

ALTER TABLE "sender_profiles" ALTER COLUMN "company_name" DROP NOT NULL;

ALTER TABLE "sender_profiles" ADD COLUMN "sender_title" VARCHAR(255);
