-- Source-backed business contacts for the companies behind shortlisted leads.
--
-- Additive: adds `contacts`, `contact_sources` and the `ContactType`,
-- `ContactUsability`, `ContactDeliverability` enums. Ownership:
-- `contact-discovery`.
--
-- `contacts` stores the values exactly as published plus `normalized_*` columns
-- used only for deduplication; `contact_sources` keeps one row per discovered
-- source (source_references is deduplicated by URL) so multiple sources never
-- overwrite earlier provenance. No research run is referenced: contact discovery
-- is independent of the completed research run.
--
-- Rollback:
--   DROP TABLE "contact_sources";
--   DROP TABLE "contacts";
--   DROP TYPE "ContactDeliverability";
--   DROP TYPE "ContactUsability";
--   DROP TYPE "ContactType";

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('GENERAL_COMPANY', 'NAMED_PERSON');

-- CreateEnum
CREATE TYPE "ContactUsability" AS ENUM ('USABLE', 'UNUSABLE');

-- CreateEnum
CREATE TYPE "ContactDeliverability" AS ENUM ('NOT_VERIFIED', 'VERIFIED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "contact_type" "ContactType" NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(64),
    "contact_page_url" VARCHAR(2048),
    "person_name" VARCHAR(255),
    "person_job_title" VARCHAR(255),
    "usability_status" "ContactUsability" NOT NULL DEFAULT 'USABLE',
    "unusable_reason" TEXT,
    "deliverability_status" "ContactDeliverability" NOT NULL DEFAULT 'NOT_VERIFIED',
    "unknowns_text" TEXT,
    "normalized_email" VARCHAR(320),
    "normalized_phone" VARCHAR(64),
    "dedup_key" VARCHAR(768) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_sources" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "source_reference_id" UUID NOT NULL,
    "retrieved_at" TIMESTAMPTZ(6) NOT NULL,
    "excerpt_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_dedup_key_key" ON "contacts"("dedup_key");

-- CreateIndex
CREATE INDEX "contacts_company_id_idx" ON "contacts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_sources_contact_id_source_reference_id_key" ON "contact_sources"("contact_id", "source_reference_id");

-- CreateIndex
CREATE INDEX "contact_sources_source_reference_id_idx" ON "contact_sources"("source_reference_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_sources" ADD CONSTRAINT "contact_sources_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_sources" ADD CONSTRAINT "contact_sources_source_reference_id_fkey" FOREIGN KEY ("source_reference_id") REFERENCES "source_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
