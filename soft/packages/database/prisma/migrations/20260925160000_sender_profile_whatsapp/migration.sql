-- Additive: WhatsApp contact metadata on sender profiles.
--
-- * `sender_profiles.whatsapp_enabled` (default false) — display metadata for the
--   generated outreach closing only; it is NOT a permission to send messages.
-- * `sender_profiles.whatsapp_phone` (optional) — when blank and
--   `whatsapp_enabled` is true, the main `phone` is used.
-- Application validation rejects `whatsapp_enabled = true` when neither a
-- WhatsApp number nor the main phone exists.
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   ALTER TABLE "sender_profiles" DROP COLUMN "whatsapp_phone";
--   ALTER TABLE "sender_profiles" DROP COLUMN "whatsapp_enabled";

-- AlterTable
ALTER TABLE "sender_profiles"
ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsapp_phone" VARCHAR(64);
