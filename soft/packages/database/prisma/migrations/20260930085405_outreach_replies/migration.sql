-- CreateEnum
CREATE TYPE "OutreachReplyClassification" AS ENUM ('INTERESTED', 'PRICE_REQUEST', 'MORE_INFO', 'NOT_INTERESTED', 'WRONG_CONTACT', 'OUT_OF_OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "OutreachReplySource" AS ENUM ('AUTO', 'HUMAN');

-- CreateEnum
CREATE TYPE "OutreachHandoffState" AS ENUM ('NO_HANDOFF', 'HANDOFF_TO_HUMAN');

-- CreateTable
CREATE TABLE "outreach_replies" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "outbound_message_id" UUID,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID,
    "company_id" UUID,
    "draft_id" UUID,
    "email_account_id" UUID NOT NULL,
    "mailbox_uid" VARCHAR(128) NOT NULL,
    "provider_message_id" VARCHAR(512),
    "in_reply_to" VARCHAR(512),
    "references" TEXT[],
    "from_email" VARCHAR(320),
    "to_email" VARCHAR(320),
    "subject" VARCHAR(512),
    "body_text" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6),
    "classification" "OutreachReplyClassification" NOT NULL DEFAULT 'OTHER',
    "classification_source" "OutreachReplySource" NOT NULL DEFAULT 'AUTO',
    "classification_reason" VARCHAR(2000),
    "handoff_state" "OutreachHandoffState" NOT NULL DEFAULT 'NO_HANDOFF',
    "excerpt" VARCHAR(1000),
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outreach_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_replies_batch_id_idx" ON "outreach_replies"("batch_id");

-- CreateIndex
CREATE INDEX "outreach_replies_outbound_message_id_idx" ON "outreach_replies"("outbound_message_id");

-- CreateIndex
CREATE INDEX "outreach_replies_classification_idx" ON "outreach_replies"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_replies_email_account_id_mailbox_uid_key" ON "outreach_replies"("email_account_id", "mailbox_uid");

-- AddForeignKey
ALTER TABLE "outreach_replies" ADD CONSTRAINT "outreach_replies_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "outreach_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_replies" ADD CONSTRAINT "outreach_replies_outbound_message_id_fkey" FOREIGN KEY ("outbound_message_id") REFERENCES "outreach_outbound_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_replies" ADD CONSTRAINT "outreach_replies_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
