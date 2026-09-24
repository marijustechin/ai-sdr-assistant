-- Additive: persisted price inquiry (RFQ) drafts. No transport, no sending; a
-- draft starts at READY_FOR_HUMAN_REVIEW. No data backfill.
--
-- Manual rollback:
--   DROP TABLE "price_inquiry_drafts";
--   DROP TYPE "PriceInquiryStatus";
--   DROP TYPE "PriceInquiryPurpose";

-- CreateEnum
CREATE TYPE "PriceInquiryPurpose" AS ENUM ('PRICE_INQUIRY');

-- CreateEnum
CREATE TYPE "PriceInquiryStatus" AS ENUM ('READY_FOR_HUMAN_REVIEW');

-- CreateTable
CREATE TABLE "price_inquiry_drafts" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "contact_id" UUID,
    "recipient_email" VARCHAR(320),
    "recipient_rationale" TEXT NOT NULL,
    "sender_profile_id" UUID,
    "email_account_id" UUID,
    "sender_snapshot" JSONB,
    "purpose" "PriceInquiryPurpose" NOT NULL DEFAULT 'PRICE_INQUIRY',
    "status" "PriceInquiryStatus" NOT NULL DEFAULT 'READY_FOR_HUMAN_REVIEW',
    "language" VARCHAR(35) NOT NULL,
    "subject" VARCHAR(512) NOT NULL,
    "body" TEXT NOT NULL,
    "generated_subject" VARCHAR(512) NOT NULL,
    "generated_body" TEXT NOT NULL,
    "specification_summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "source_reference_id" UUID,
    "evidence_id" UUID,
    "claim_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "price_inquiry_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "price_inquiry_drafts_fingerprint_key" ON "price_inquiry_drafts"("fingerprint");

-- CreateIndex
CREATE INDEX "price_inquiry_drafts_opportunity_id_idx" ON "price_inquiry_drafts"("opportunity_id");

-- CreateIndex
CREATE INDEX "price_inquiry_drafts_lead_id_idx" ON "price_inquiry_drafts"("lead_id");

-- CreateIndex
CREATE INDEX "price_inquiry_drafts_company_id_idx" ON "price_inquiry_drafts"("company_id");

-- CreateIndex
CREATE INDEX "price_inquiry_drafts_product_id_idx" ON "price_inquiry_drafts"("product_id");

-- CreateIndex
CREATE INDEX "price_inquiry_drafts_contact_id_idx" ON "price_inquiry_drafts"("contact_id");

-- CreateIndex
CREATE INDEX "price_inquiry_drafts_sender_profile_id_idx" ON "price_inquiry_drafts"("sender_profile_id");

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "opportunity_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "sender_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_inquiry_drafts" ADD CONSTRAINT "price_inquiry_drafts_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
