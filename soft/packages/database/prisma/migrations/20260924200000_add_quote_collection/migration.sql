-- Additive: market-research supplier quote collection — the controlled RFQ loop
-- (approval-gated send, bounded reply capture, structured quote extraction).
-- No existing table is altered except the PriceInquiryStatus enum, which gains
-- new lifecycle values. No data backfill.
--
-- Manual rollback (Postgres cannot remove enum values in place):
--   DROP TABLE "supplier_quotes";
--   DROP TABLE "quote_inbound_messages";
--   DROP TABLE "quote_outbound_messages";
--   DROP TYPE "QuoteMatchConfidence";
--   DROP TYPE "QuoteInboundStatus";
--   DROP TYPE "QuoteOutboundStatus";
--   -- "PriceInquiryStatus" keeps the added values; to remove them, recreate the
--   -- type with only 'READY_FOR_HUMAN_REVIEW' once no row uses the new values.

-- AlterEnum
ALTER TYPE "PriceInquiryStatus" ADD VALUE 'SENT';
ALTER TYPE "PriceInquiryStatus" ADD VALUE 'REPLY_RECEIVED';
ALTER TYPE "PriceInquiryStatus" ADD VALUE 'QUOTE_EXTRACTED';

-- CreateEnum
CREATE TYPE "QuoteOutboundStatus" AS ENUM ('SUBMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "QuoteInboundStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'EXTRACTED');

-- CreateEnum
CREATE TYPE "QuoteMatchConfidence" AS ENUM ('HEADER', 'FALLBACK', 'NONE');

-- CreateTable
CREATE TABLE "quote_outbound_messages" (
    "id" UUID NOT NULL,
    "price_inquiry_draft_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sender_profile_id" UUID,
    "email_account_id" UUID,
    "from_email" VARCHAR(320) NOT NULL,
    "reply_to_email" VARCHAR(320),
    "recipient_email" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(512) NOT NULL,
    "body" TEXT NOT NULL,
    "message_id" VARCHAR(512) NOT NULL,
    "provider_message_id" VARCHAR(512),
    "submission_status" "QuoteOutboundStatus" NOT NULL DEFAULT 'SUBMITTED',
    "failure_code" VARCHAR(64),
    "sent_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_outbound_messages_message_id_key" ON "quote_outbound_messages"("message_id");

-- CreateIndex
CREATE INDEX "quote_outbound_messages_price_inquiry_draft_id_idx" ON "quote_outbound_messages"("price_inquiry_draft_id");

-- CreateIndex
CREATE INDEX "quote_outbound_messages_email_account_id_idx" ON "quote_outbound_messages"("email_account_id");

-- CreateIndex
CREATE INDEX "quote_outbound_messages_recipient_email_idx" ON "quote_outbound_messages"("recipient_email");

-- CreateTable
CREATE TABLE "quote_inbound_messages" (
    "id" UUID NOT NULL,
    "email_account_id" UUID,
    "outbound_message_id" UUID,
    "price_inquiry_draft_id" UUID,
    "mailbox_uid" VARCHAR(128) NOT NULL,
    "provider_message_id" VARCHAR(512),
    "in_reply_to" VARCHAR(512),
    "references" TEXT[],
    "from_email" VARCHAR(320),
    "to_email" VARCHAR(320),
    "subject" VARCHAR(512),
    "body_text" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6),
    "processing_status" "QuoteInboundStatus" NOT NULL DEFAULT 'UNMATCHED',
    "match_confidence" "QuoteMatchConfidence" NOT NULL DEFAULT 'NONE',
    "research_run_id" UUID,
    "source_reference_id" UUID,
    "evidence_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quote_inbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_inbound_messages_email_account_id_mailbox_uid_key" ON "quote_inbound_messages"("email_account_id", "mailbox_uid");

-- CreateIndex
CREATE INDEX "quote_inbound_messages_outbound_message_id_idx" ON "quote_inbound_messages"("outbound_message_id");

-- CreateIndex
CREATE INDEX "quote_inbound_messages_price_inquiry_draft_id_idx" ON "quote_inbound_messages"("price_inquiry_draft_id");

-- CreateIndex
CREATE INDEX "quote_inbound_messages_evidence_id_idx" ON "quote_inbound_messages"("evidence_id");

-- CreateTable
CREATE TABLE "supplier_quotes" (
    "id" UUID NOT NULL,
    "inbound_message_id" UUID NOT NULL,
    "outbound_message_id" UUID,
    "price_inquiry_draft_id" UUID,
    "research_run_id" UUID,
    "price_text" TEXT,
    "price_amount" DECIMAL(18,6),
    "currency" VARCHAR(12),
    "price_unit" VARCHAR(64),
    "moq_text" VARCHAR(255),
    "incoterm" VARCHAR(16),
    "loading_location_text" VARCHAR(255),
    "lead_time_text" VARCHAR(255),
    "validity_text" VARCHAR(255),
    "vat_included" BOOLEAN,
    "qualification_text" TEXT,
    "field_provenance" JSONB,
    "warnings" TEXT[],
    "source_reference_id" UUID,
    "evidence_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_quotes_inbound_message_id_key" ON "supplier_quotes"("inbound_message_id");

-- CreateIndex
CREATE INDEX "supplier_quotes_price_inquiry_draft_id_idx" ON "supplier_quotes"("price_inquiry_draft_id");

-- CreateIndex
CREATE INDEX "supplier_quotes_outbound_message_id_idx" ON "supplier_quotes"("outbound_message_id");

-- CreateIndex
CREATE INDEX "supplier_quotes_evidence_id_idx" ON "supplier_quotes"("evidence_id");

-- AddForeignKey
ALTER TABLE "quote_outbound_messages" ADD CONSTRAINT "quote_outbound_messages_price_inquiry_draft_id_fkey" FOREIGN KEY ("price_inquiry_draft_id") REFERENCES "price_inquiry_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_outbound_messages" ADD CONSTRAINT "quote_outbound_messages_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "sender_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_outbound_messages" ADD CONSTRAINT "quote_outbound_messages_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_inbound_messages" ADD CONSTRAINT "quote_inbound_messages_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_inbound_messages" ADD CONSTRAINT "quote_inbound_messages_outbound_message_id_fkey" FOREIGN KEY ("outbound_message_id") REFERENCES "quote_outbound_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_inbound_messages" ADD CONSTRAINT "quote_inbound_messages_price_inquiry_draft_id_fkey" FOREIGN KEY ("price_inquiry_draft_id") REFERENCES "price_inquiry_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_inbound_messages" ADD CONSTRAINT "quote_inbound_messages_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_inbound_messages" ADD CONSTRAINT "quote_inbound_messages_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_inbound_message_id_fkey" FOREIGN KEY ("inbound_message_id") REFERENCES "quote_inbound_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_outbound_message_id_fkey" FOREIGN KEY ("outbound_message_id") REFERENCES "quote_outbound_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
