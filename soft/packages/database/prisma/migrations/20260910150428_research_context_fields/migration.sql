-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "context_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "objective" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" VARCHAR(120);
