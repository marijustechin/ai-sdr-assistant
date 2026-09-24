-- Split the single product sender assignment into two explicit contexts:
-- `outreach_sender_profile_id` (buyer/sales outreach) and
-- `inquiry_sender_profile_id` (market-research price inquiries / RFQ).
-- The existing column is renamed (existing assignments are preserved); the
-- inquiry column is new and nullable. No data is removed.
--
-- Manual rollback:
--   ALTER TABLE "products" DROP CONSTRAINT "products_inquiry_sender_profile_id_fkey";
--   DROP INDEX "products_inquiry_sender_profile_id_idx";
--   ALTER TABLE "products" DROP COLUMN "inquiry_sender_profile_id";
--   ALTER INDEX "products_outreach_sender_profile_id_idx" RENAME TO "products_sender_profile_id_idx";
--   ALTER TABLE "products" RENAME CONSTRAINT "products_outreach_sender_profile_id_fkey" TO "products_sender_profile_id_fkey";
--   ALTER TABLE "products" RENAME COLUMN "outreach_sender_profile_id" TO "sender_profile_id";

ALTER TABLE "products" RENAME COLUMN "sender_profile_id" TO "outreach_sender_profile_id";

ALTER TABLE "products" RENAME CONSTRAINT "products_sender_profile_id_fkey" TO "products_outreach_sender_profile_id_fkey";

ALTER INDEX "products_sender_profile_id_idx" RENAME TO "products_outreach_sender_profile_id_idx";

ALTER TABLE "products" ADD COLUMN "inquiry_sender_profile_id" UUID;

CREATE INDEX "products_inquiry_sender_profile_id_idx" ON "products"("inquiry_sender_profile_id");

ALTER TABLE "products" ADD CONSTRAINT "products_inquiry_sender_profile_id_fkey" FOREIGN KEY ("inquiry_sender_profile_id") REFERENCES "sender_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
