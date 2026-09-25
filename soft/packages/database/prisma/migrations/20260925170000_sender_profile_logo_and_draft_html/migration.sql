-- Additive: optional logo branding for generated HTML outreach signatures.
--
-- * `sender_profiles.logo_url` (optional) and `include_logo_in_signature`
--   (default false). The logo appears in the **HTML** signature only when
--   enabled; the plain-text signature never contains it, and a missing/broken
--   image never breaks the signature. A logo URL is never invented.
-- * `outreach_drafts.html_body` (optional): the generated HTML body (text body
--   plus HTML signature), stored for review/transport.
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   ALTER TABLE "outreach_drafts" DROP COLUMN "html_body";
--   ALTER TABLE "sender_profiles" DROP COLUMN "include_logo_in_signature";
--   ALTER TABLE "sender_profiles" DROP COLUMN "logo_url";

-- AlterTable
ALTER TABLE "sender_profiles"
ADD COLUMN "logo_url" VARCHAR(2048),
ADD COLUMN "include_logo_in_signature" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "outreach_drafts" ADD COLUMN "html_body" TEXT;
