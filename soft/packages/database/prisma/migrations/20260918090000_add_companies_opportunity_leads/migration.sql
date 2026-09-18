-- Evidence-backed potential-buyer shortlist (bounded "leads" slice).
--
-- Additive: adds `companies`, `opportunity_companies`, and the `LeadReviewStatus`
-- enum. No existing table or column is modified. Ownership: `lead-discoverer`.
--
-- A candidate (`opportunity_companies` row) links an opportunity + company to
-- the research evidence that supports its inclusion (`source_reference_id`,
-- `evidence_id`, optional `claim_id`). Observed facts stay separate from the
-- buyer-fit hypothesis; the operator review state is `review_status`.
-- `dedup_key` and `(opportunity_id, company_id)` make resubmission idempotent.
--
-- Rollback:
--   DROP TABLE "opportunity_companies";
--   DROP TABLE "companies";
--   DROP TYPE "LeadReviewStatus";

-- CreateEnum
CREATE TYPE "LeadReviewStatus" AS ENUM ('UNREVIEWED', 'SHORTLISTED', 'REJECTED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "normalized_name" VARCHAR(255) NOT NULL,
    "website" VARCHAR(2048),
    "country" VARCHAR(120),
    "identity_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_companies" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "observed_activity_text" TEXT NOT NULL,
    "observed_roles" TEXT[],
    "buyer_fit_hypothesis_text" TEXT NOT NULL,
    "unknowns_text" TEXT,
    "next_verification_step_text" TEXT,
    "review_status" "LeadReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "review_reason" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "source_reference_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "claim_id" UUID,
    "dedup_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "opportunity_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_identity_key_key" ON "companies"("identity_key");

-- CreateIndex
CREATE INDEX "companies_normalized_name_idx" ON "companies"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_companies_dedup_key_key" ON "opportunity_companies"("dedup_key");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_companies_opportunity_id_company_id_key" ON "opportunity_companies"("opportunity_id", "company_id");

-- CreateIndex
CREATE INDEX "opportunity_companies_opportunity_id_idx" ON "opportunity_companies"("opportunity_id");

-- CreateIndex
CREATE INDEX "opportunity_companies_company_id_idx" ON "opportunity_companies"("company_id");

-- CreateIndex
CREATE INDEX "opportunity_companies_claim_id_idx" ON "opportunity_companies"("claim_id");

-- AddForeignKey
ALTER TABLE "opportunity_companies" ADD CONSTRAINT "opportunity_companies_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_companies" ADD CONSTRAINT "opportunity_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_companies" ADD CONSTRAINT "opportunity_companies_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_companies" ADD CONSTRAINT "opportunity_companies_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_companies" ADD CONSTRAINT "opportunity_companies_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
