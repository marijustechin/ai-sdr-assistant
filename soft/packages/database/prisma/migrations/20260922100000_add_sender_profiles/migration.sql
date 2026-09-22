-- Reusable sender profiles + product assignment + draft sender snapshot
-- (O-021 extension). Additive.
--
-- `sender_profiles` stores an identity (no SMTP required) plus optional SMTP
-- configuration. The SMTP password is stored only as an encrypted ciphertext;
-- the key lives in server configuration, never in the database or Git.
-- `products.sender_profile_id` is an optional, explicit assignment;
-- `outreach_drafts.sender_profile_id` + `sender_snapshot` record the non-secret
-- identity actually used. No send state, no transport.
--
-- Owner: `sender-profiles` (profiles); `products-and-offers` (product column);
-- `outreach-drafter` (draft columns).
--
-- Rollback:
--   ALTER TABLE "outreach_drafts" DROP CONSTRAINT "outreach_drafts_sender_profile_id_fkey";
--   DROP INDEX "outreach_drafts_sender_profile_id_idx";
--   ALTER TABLE "outreach_drafts" DROP COLUMN "sender_snapshot", DROP COLUMN "sender_profile_id";
--   ALTER TABLE "products" DROP CONSTRAINT "products_sender_profile_id_fkey";
--   DROP INDEX "products_sender_profile_id_idx";
--   ALTER TABLE "products" DROP COLUMN "sender_profile_id";
--   DROP TABLE "sender_profiles";
--   DROP TYPE "SmtpTlsMode"; DROP TYPE "SenderProfileStatus";

-- CreateEnum
CREATE TYPE "SenderProfileStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "SmtpTlsMode" AS ENUM ('NONE', 'STARTTLS', 'SSL_TLS');

-- CreateTable
CREATE TABLE "sender_profiles" (
    "id" UUID NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "sender_name" VARCHAR(255) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "from_email" VARCHAR(320) NOT NULL,
    "reply_to_email" VARCHAR(320),
    "signature" TEXT,
    "status" "SenderProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "smtp_host" VARCHAR(255),
    "smtp_port" INTEGER,
    "smtp_tls_mode" "SmtpTlsMode",
    "smtp_username" VARCHAR(255),
    "smtp_password_ciphertext" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "sender_profiles_pkey" PRIMARY KEY ("id")
);

-- AlterTable products
ALTER TABLE "products" ADD COLUMN "sender_profile_id" UUID;

-- CreateIndex
CREATE INDEX "products_sender_profile_id_idx" ON "products"("sender_profile_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "sender_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable outreach_drafts
ALTER TABLE "outreach_drafts" ADD COLUMN "sender_profile_id" UUID;
ALTER TABLE "outreach_drafts" ADD COLUMN "sender_snapshot" JSONB;

-- CreateIndex
CREATE INDEX "outreach_drafts_sender_profile_id_idx" ON "outreach_drafts"("sender_profile_id");

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "sender_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
