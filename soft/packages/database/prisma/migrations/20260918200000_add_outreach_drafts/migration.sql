-- Evidence-backed initial outreach drafts (bounded `outreach-drafter` slice).
--
-- Additive: `outreach_drafts` + `OutreachPreparationStatus`. Owner:
-- `outreach-drafter`. A draft records the selected recipient, subject/body,
-- language, preparation status (PREPARED | BLOCKED), rationale/references and
-- precise missing fields; it is append-only (unique `fingerprint` for
-- idempotency, `version` per opportunity+lead) and represents no sending.
--
-- Rollback:
--   DROP TABLE "outreach_drafts";
--   DROP TYPE "OutreachPreparationStatus";

-- CreateEnum
CREATE TYPE "OutreachPreparationStatus" AS ENUM ('PREPARED', 'BLOCKED');

-- CreateTable
CREATE TABLE "outreach_drafts" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "contact_id" UUID,
    "recipient_email" VARCHAR(320),
    "language" VARCHAR(35) NOT NULL,
    "preparation_status" "OutreachPreparationStatus" NOT NULL DEFAULT 'BLOCKED',
    "subject" VARCHAR(512),
    "body" TEXT,
    "rationale" TEXT NOT NULL,
    "recipient_rationale" TEXT NOT NULL,
    "missing_fields" TEXT[],
    "context_version" INTEGER,
    "evidence_id" UUID,
    "claim_id" UUID,
    "source_reference_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fingerprint" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outreach_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outreach_drafts_fingerprint_key" ON "outreach_drafts"("fingerprint");

-- CreateIndex
CREATE INDEX "outreach_drafts_opportunity_id_idx" ON "outreach_drafts"("opportunity_id");

-- CreateIndex
CREATE INDEX "outreach_drafts_lead_id_idx" ON "outreach_drafts"("lead_id");

-- CreateIndex
CREATE INDEX "outreach_drafts_company_id_idx" ON "outreach_drafts"("company_id");

-- CreateIndex
CREATE INDEX "outreach_drafts_contact_id_idx" ON "outreach_drafts"("contact_id");

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "opportunity_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
