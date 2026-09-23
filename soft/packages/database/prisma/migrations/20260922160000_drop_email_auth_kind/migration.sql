-- Remove the reserved auth-kind discriminator. Email accounts are
-- password-authenticated; the column defaulted to PASSWORD and encoded no live
-- behaviour, so there is no data to migrate.
--
-- Manual rollback:
--   CREATE TYPE "EmailAuthKind" AS ENUM ('PASSWORD', 'OAUTH2');
--   ALTER TABLE "email_accounts" ADD COLUMN "auth_kind" "EmailAuthKind" NOT NULL DEFAULT 'PASSWORD';

ALTER TABLE "email_accounts" DROP COLUMN "auth_kind";

DROP TYPE "EmailAuthKind";
