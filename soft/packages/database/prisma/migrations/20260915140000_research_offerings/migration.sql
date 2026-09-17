-- CreateEnum
CREATE TYPE "OfferingVatStatus" AS ENUM ('INCLUDED', 'EXCLUDED', 'NOT_STATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OfferingPriceBasis" AS ENUM ('RETAIL_LIST', 'TRADE_B2B', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OfferingSampleKind" AS ENUM ('SAMPLE', 'FULL_PRODUCT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OfferingMatchType" AS ENUM ('EXACT_MATCH', 'ADJACENT', 'SUBSTITUTE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "research_offerings" (
    "id" UUID NOT NULL,
    "research_run_id" UUID NOT NULL,
    "company_text" VARCHAR(255),
    "company_location_text" VARCHAR(255),
    "market_served_text" VARCHAR(255),
    "product_text" VARCHAR(512),
    "application_text" VARCHAR(255),
    "treatment_text" VARCHAR(255),
    "dimensions_text" VARCHAR(255),
    "price_text" TEXT,
    "price_currency" VARCHAR(12),
    "price_unit" VARCHAR(64),
    "vat_status" "OfferingVatStatus" NOT NULL DEFAULT 'UNKNOWN',
    "price_basis" "OfferingPriceBasis" NOT NULL DEFAULT 'UNKNOWN',
    "sample_kind" "OfferingSampleKind" NOT NULL DEFAULT 'UNKNOWN',
    "match_type" "OfferingMatchType" NOT NULL DEFAULT 'UNKNOWN',
    "source_reference_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "claim_id" UUID,
    "fingerprint" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "research_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_offerings_fingerprint_key" ON "research_offerings"("fingerprint");

-- CreateIndex
CREATE INDEX "research_offerings_research_run_id_idx" ON "research_offerings"("research_run_id");

-- CreateIndex
CREATE INDEX "research_offerings_evidence_id_idx" ON "research_offerings"("evidence_id");

-- CreateIndex
CREATE INDEX "research_offerings_claim_id_idx" ON "research_offerings"("claim_id");

-- AddForeignKey
ALTER TABLE "research_offerings" ADD CONSTRAINT "research_offerings_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_offerings" ADD CONSTRAINT "research_offerings_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_offerings" ADD CONSTRAINT "research_offerings_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_offerings" ADD CONSTRAINT "research_offerings_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
