-- CreateEnum
CREATE TYPE "OutreachTestDeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "outreach_test_deliveries" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "email_account_id" UUID,
    "sender_profile_id" UUID,
    "original_recipient" VARCHAR(320) NOT NULL,
    "test_recipient" VARCHAR(320) NOT NULL,
    "from_name" VARCHAR(255),
    "from_email" VARCHAR(320) NOT NULL,
    "reply_to_email" VARCHAR(320),
    "subject" VARCHAR(512) NOT NULL,
    "subject_prefixed" BOOLEAN NOT NULL DEFAULT false,
    "language" VARCHAR(35) NOT NULL,
    "status" "OutreachTestDeliveryStatus" NOT NULL DEFAULT 'FAILED',
    "message_id" VARCHAR(512) NOT NULL,
    "provider_message_id" VARCHAR(512),
    "failure_code" VARCHAR(64),
    "smtp_submitted_at" TIMESTAMPTZ(6),
    "sent_copy_status" "OutreachSentCopyStatus" NOT NULL DEFAULT 'PENDING',
    "sent_copy_attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_copy_error" VARCHAR(120),
    "sent_copy_appended_at" TIMESTAMPTZ(6),
    "raw_message" BYTEA,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outreach_test_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outreach_test_deliveries_message_id_key" ON "outreach_test_deliveries"("message_id");

-- CreateIndex
CREATE INDEX "outreach_test_deliveries_batch_id_idx" ON "outreach_test_deliveries"("batch_id");

-- CreateIndex
CREATE INDEX "outreach_test_deliveries_draft_id_idx" ON "outreach_test_deliveries"("draft_id");

-- AddForeignKey
ALTER TABLE "outreach_test_deliveries" ADD CONSTRAINT "outreach_test_deliveries_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "outreach_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
