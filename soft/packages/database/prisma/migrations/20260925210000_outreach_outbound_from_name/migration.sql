-- Additive: outbound sender display name for the frozen From header.
--
-- Manual rollback:
--   ALTER TABLE "outreach_outbound_messages" DROP COLUMN "from_name";

-- AlterTable
ALTER TABLE "outreach_outbound_messages" ADD COLUMN "from_name" VARCHAR(255);
