-- Additive: canonical editable outreach body.
--
-- * `outreach_drafts.canonical_body` (optional): the human-editable message body
--   WITHOUT the closing/signature. The sendable `body` (plain text) and
--   `html_body` are derived from this canonical body plus the structured sender
--   identity/branding, so editing it can never leave a stale HTML body paired
--   with new plain text.
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   ALTER TABLE "outreach_drafts" DROP COLUMN "canonical_body";

-- AlterTable
ALTER TABLE "outreach_drafts" ADD COLUMN "canonical_body" TEXT;
