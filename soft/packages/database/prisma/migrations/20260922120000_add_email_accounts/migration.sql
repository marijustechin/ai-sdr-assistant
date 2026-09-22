-- Additive refactor: separate the mailbox transport (`email_accounts`, owner
-- `email-accounts`) from the sender identity (`sender_profiles`, owner
-- `sender-profiles`). SMTP moves off `sender_profiles`; IMAP is added on the new
-- account table. `outreach_drafts` records the resolved `email_account_id`.
--
-- No live sender profiles existed when this migration was authored (the previous
-- extension was never committed and `sender_profiles` held no real rows), so no
-- data backfill is required. This migration is additive and must not be applied
-- as part of a database reset.
--
-- Manual rollback:
--   ALTER TABLE "outreach_drafts" DROP CONSTRAINT "outreach_drafts_email_account_id_fkey";
--   DROP INDEX "outreach_drafts_email_account_id_idx";
--   ALTER TABLE "outreach_drafts" DROP COLUMN "email_account_id";
--   ALTER TABLE "sender_profiles" DROP CONSTRAINT "sender_profiles_email_account_id_fkey";
--   DROP INDEX "sender_profiles_email_account_id_idx";
--   ALTER TABLE "sender_profiles" DROP COLUMN "email_account_id";
--   ALTER TABLE "sender_profiles"
--     ADD COLUMN "smtp_host" VARCHAR(255),
--     ADD COLUMN "smtp_port" INTEGER,
--     ADD COLUMN "smtp_tls_mode" "EmailTlsMode",
--     ADD COLUMN "smtp_username" VARCHAR(255),
--     ADD COLUMN "smtp_password_ciphertext" TEXT;
--   DROP TABLE "email_accounts";
--   ALTER TYPE "EmailTlsMode" RENAME TO "SmtpTlsMode";
--   DROP TYPE "EmailAccountStatus";
--   DROP TYPE "EmailAuthKind";

-- CreateEnum
CREATE TYPE "EmailAccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "EmailAuthKind" AS ENUM ('PASSWORD', 'OAUTH2');

-- RenameEnum (the enum is now shared by SMTP and IMAP on email_accounts)
ALTER TYPE "SmtpTlsMode" RENAME TO "EmailTlsMode";

-- CreateTable
CREATE TABLE "email_accounts" (
    "id" UUID NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "account_email" VARCHAR(320) NOT NULL,
    "status" "EmailAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "auth_kind" "EmailAuthKind" NOT NULL DEFAULT 'PASSWORD',
    "provider" VARCHAR(64),
    "smtp_host" VARCHAR(255),
    "smtp_port" INTEGER,
    "smtp_tls_mode" "EmailTlsMode",
    "smtp_username" VARCHAR(255),
    "smtp_password_ciphertext" TEXT,
    "imap_host" VARCHAR(255),
    "imap_port" INTEGER,
    "imap_tls_mode" "EmailTlsMode",
    "imap_username" VARCHAR(255),
    "imap_password_ciphertext" TEXT,
    "credentials_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable: sender identity keeps references only; transport columns move.
ALTER TABLE "sender_profiles" ADD COLUMN "email_account_id" UUID;
ALTER TABLE "sender_profiles"
    DROP COLUMN "smtp_host",
    DROP COLUMN "smtp_port",
    DROP COLUMN "smtp_tls_mode",
    DROP COLUMN "smtp_username",
    DROP COLUMN "smtp_password_ciphertext";

-- AlterTable: drafts reference the resolved mailbox connection.
ALTER TABLE "outreach_drafts" ADD COLUMN "email_account_id" UUID;

-- CreateIndex
CREATE INDEX "sender_profiles_email_account_id_idx" ON "sender_profiles"("email_account_id");

-- CreateIndex
CREATE INDEX "outreach_drafts_email_account_id_idx" ON "outreach_drafts"("email_account_id");

-- AddForeignKey
ALTER TABLE "sender_profiles" ADD CONSTRAINT "sender_profiles_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
