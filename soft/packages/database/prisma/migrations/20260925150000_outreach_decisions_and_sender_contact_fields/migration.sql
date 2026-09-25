-- Additive: human outreach eligibility decisions + sender-profile contact fields.
--
-- * New `outreach_decisions` (owner `outreach-drafter`): an opportunity+company
--   scoped human decision (ELIGIBLE | DO_NOT_CONTACT | EXISTING_RELATIONSHIP |
--   NOT_RELEVANT | ALREADY_CONTACTED) with an optional note and explicit human
--   provenance (decided_by_kind = HUMAN, decided_at). A human exclusion
--   overrides the agent qualification and blocks outreach drafting.
-- * `sender_profiles` gains `phone` and `website` (structured closing fields).
-- No existing data is altered or backfilled by this migration.
--
-- Manual rollback:
--   ALTER TABLE "sender_profiles" DROP COLUMN "website";
--   ALTER TABLE "sender_profiles" DROP COLUMN "phone";
--   DROP TABLE "outreach_decisions";
--   DROP TYPE "OutreachDecisionSource";
--   DROP TYPE "OutreachDecisionStatus";

-- CreateEnum
CREATE TYPE "OutreachDecisionStatus" AS ENUM ('ELIGIBLE', 'DO_NOT_CONTACT', 'EXISTING_RELATIONSHIP', 'NOT_RELEVANT', 'ALREADY_CONTACTED');

-- CreateEnum
CREATE TYPE "OutreachDecisionSource" AS ENUM ('HUMAN');

-- AlterTable
ALTER TABLE "sender_profiles" ADD COLUMN "phone" VARCHAR(64),
ADD COLUMN "website" VARCHAR(2048);

-- CreateTable
CREATE TABLE "outreach_decisions" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "decision" "OutreachDecisionStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "note" TEXT,
    "decided_by_kind" "OutreachDecisionSource" NOT NULL DEFAULT 'HUMAN',
    "decided_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outreach_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outreach_decisions_opportunity_id_company_id_key" ON "outreach_decisions"("opportunity_id", "company_id");

-- CreateIndex
CREATE INDEX "outreach_decisions_company_id_idx" ON "outreach_decisions"("company_id");

-- AddForeignKey
ALTER TABLE "outreach_decisions" ADD CONSTRAINT "outreach_decisions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_decisions" ADD CONSTRAINT "outreach_decisions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
