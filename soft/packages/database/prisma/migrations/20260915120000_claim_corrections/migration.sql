-- CreateEnum
CREATE TYPE "ClaimLifecycleStatus" AS ENUM ('CURRENT', 'RETRACTED', 'REPLACED');

-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "lifecycle_status" "ClaimLifecycleStatus" NOT NULL DEFAULT 'CURRENT',
ADD COLUMN     "correction_reason" TEXT,
ADD COLUMN     "corrected_at" TIMESTAMPTZ(6),
ADD COLUMN     "replaced_by_claim_id" UUID;

-- CreateIndex
CREATE INDEX "claims_lifecycle_status_idx" ON "claims"("lifecycle_status");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_replaced_by_claim_id_fkey" FOREIGN KEY ("replaced_by_claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
