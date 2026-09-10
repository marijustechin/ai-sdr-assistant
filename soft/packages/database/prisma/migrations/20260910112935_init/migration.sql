-- CreateEnum
CREATE TYPE "ProductLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TargetMarketStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FactStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "FactVisibility" AS ENUM ('OPERATIONAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "scientific_name" VARCHAR(255),
    "description" TEXT,
    "lifecycle_status" "ProductLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "commercial_status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_facts" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "offer_id" UUID,
    "key" VARCHAR(255) NOT NULL,
    "value_text" TEXT,
    "value_numeric" DECIMAL(18,6),
    "unit" VARCHAR(64),
    "status" "FactStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "FactVisibility" NOT NULL DEFAULT 'OPERATIONAL',
    "source_label" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_markets" (
    "id" UUID NOT NULL,
    "country" VARCHAR(120) NOT NULL,
    "segment" VARCHAR(255) NOT NULL,
    "lifecycle_status" "TargetMarketStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "target_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "lifecycle_status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_target_markets" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "target_market_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_target_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_runs" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'QUEUED',
    "context_version" INTEGER NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "error_code" VARCHAR(120),
    "error_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "research_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_run_target_markets" (
    "id" UUID NOT NULL,
    "research_run_id" UUID NOT NULL,
    "target_market_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_run_target_markets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_product_id_idx" ON "offers"("product_id");

-- CreateIndex
CREATE INDEX "product_facts_product_id_idx" ON "product_facts"("product_id");

-- CreateIndex
CREATE INDEX "product_facts_offer_id_idx" ON "product_facts"("offer_id");

-- CreateIndex
CREATE INDEX "product_facts_key_idx" ON "product_facts"("key");

-- CreateIndex
CREATE UNIQUE INDEX "target_markets_country_segment_key" ON "target_markets"("country", "segment");

-- CreateIndex
CREATE INDEX "opportunities_offer_id_idx" ON "opportunities"("offer_id");

-- CreateIndex
CREATE INDEX "opportunity_target_markets_target_market_id_idx" ON "opportunity_target_markets"("target_market_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_target_markets_opportunity_id_target_market_id_key" ON "opportunity_target_markets"("opportunity_id", "target_market_id");

-- CreateIndex
CREATE INDEX "research_runs_opportunity_id_idx" ON "research_runs"("opportunity_id");

-- CreateIndex
CREATE INDEX "research_run_target_markets_target_market_id_idx" ON "research_run_target_markets"("target_market_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_run_target_markets_research_run_id_target_market_i_key" ON "research_run_target_markets"("research_run_id", "target_market_id");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_facts" ADD CONSTRAINT "product_facts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_facts" ADD CONSTRAINT "product_facts_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_target_markets" ADD CONSTRAINT "opportunity_target_markets_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_target_markets" ADD CONSTRAINT "opportunity_target_markets_target_market_id_fkey" FOREIGN KEY ("target_market_id") REFERENCES "target_markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_run_target_markets" ADD CONSTRAINT "research_run_target_markets_research_run_id_fkey" FOREIGN KEY ("research_run_id") REFERENCES "research_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_run_target_markets" ADD CONSTRAINT "research_run_target_markets_target_market_id_fkey" FOREIGN KEY ("target_market_id") REFERENCES "target_markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint (hand-authored: Prisma cannot express CHECK constraints)
-- A product fact must belong to exactly one subject: either a Product or an
-- Offer — never both, never neither.
ALTER TABLE "product_facts" ADD CONSTRAINT "product_facts_exactly_one_subject_check"
  CHECK ((("product_id" IS NOT NULL)::integer + ("offer_id" IS NOT NULL)::integer) = 1);

-- AddCheckConstraint (hand-authored: Prisma cannot express CHECK constraints)
-- A product fact must carry at least one value (textual or numeric).
ALTER TABLE "product_facts" ADD CONSTRAINT "product_facts_has_value_check"
  CHECK ("value_text" IS NOT NULL OR "value_numeric" IS NOT NULL);
