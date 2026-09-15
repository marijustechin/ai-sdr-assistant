-- CreateEnum
CREATE TYPE "ResearchRunPauseReason" AS ENUM ('BUDGET_EXHAUSTED', 'ACCESS_BLOCKED', 'CONTEXT_CHANGED', 'DIMINISHING_RETURNS', 'NEEDS_HUMAN');

-- CreateEnum
CREATE TYPE "ResearchQueryStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceVerificationStatus" AS ENUM ('VERIFIED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('FACT', 'INFERENCE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClaimConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ClaimEvidenceStance" AS ENUM ('SUPPORTS', 'REFUTES', 'CONTEXT');

-- AlterEnum
ALTER TYPE "ResearchRunStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "research_runs" ADD COLUMN     "checkpoint" JSONB,
ADD COLUMN     "checkpoint_at" TIMESTAMPTZ(6),
ADD COLUMN     "pause_note" TEXT,
ADD COLUMN     "pause_reason" "ResearchRunPauseReason";

-- CreateTable
CREATE TABLE "research_queries" (
    "id" UUID NOT NULL,
    "research_run_id" UUID NOT NULL,
    "query_text" TEXT NOT NULL,
    "provider" VARCHAR(120),
    "status" "ResearchQueryStatus" NOT NULL DEFAULT 'PENDING',
    "executed_at" TIMESTAMPTZ(6),
    "result_count" INTEGER,
    "error_code" VARCHAR(120),
    "error_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_references" (
    "id" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "title" VARCHAR(512),
    "publisher" VARCHAR(255),
    "source_type" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "source_reference_id" UUID NOT NULL,
    "research_run_id" UUID NOT NULL,
    "evidence_text" TEXT NOT NULL,
    "verification_status" "EvidenceVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "retrieved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "research_run_id" UUID NOT NULL,
    "type" "ClaimType" NOT NULL,
    "statement" TEXT NOT NULL,
    "confidence" "ClaimConfidence" NOT NULL DEFAULT 'LOW',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_evidence" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "stance" "ClaimEvidenceStance" NOT NULL DEFAULT 'SUPPORTS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_queries_research_run_id_idx" ON "research_queries"("research_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_references_url_key" ON "source_references"("url");

-- CreateIndex
CREATE INDEX "evidence_source_reference_id_idx" ON "evidence"("source_reference_id");

-- CreateIndex
CREATE INDEX "evidence_research_run_id_idx" ON "evidence"("research_run_id");

-- CreateIndex
CREATE INDEX "claims_research_run_id_idx" ON "claims"("research_run_id");

-- CreateIndex
CREATE INDEX "claim_evidence_evidence_id_idx" ON "claim_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "claim_evidence_claim_id_evidence_id_key" ON "claim_evidence"("claim_id", "evidence_id");

-- AddForeignKey
ALTER TABLE "research_queries" ADD CONSTRAINT "research_queries_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
