-- CreateEnum
CREATE TYPE "CompanyBriefStatus" AS ENUM ('COMPILED', 'ENRICHMENT_REQUESTED', 'ENRICHED');

-- CreateTable
CREATE TABLE "company_briefs" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_brief_snapshots" (
    "id" UUID NOT NULL,
    "brief_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CompanyBriefStatus" NOT NULL DEFAULT 'COMPILED',
    "prepared_at" TIMESTAMPTZ(6) NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ(6) NOT NULL,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,
    "enrichment_note" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_brief_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_briefs_company_id_idx" ON "company_briefs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_briefs_opportunity_id_company_id_key" ON "company_briefs"("opportunity_id", "company_id");

-- CreateIndex
CREATE INDEX "company_brief_snapshots_brief_id_status_idx" ON "company_brief_snapshots"("brief_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "company_brief_snapshots_brief_id_version_key" ON "company_brief_snapshots"("brief_id", "version");

-- AddForeignKey
ALTER TABLE "company_briefs" ADD CONSTRAINT "company_briefs_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_briefs" ADD CONSTRAINT "company_briefs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_brief_snapshots" ADD CONSTRAINT "company_brief_snapshots_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "company_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
