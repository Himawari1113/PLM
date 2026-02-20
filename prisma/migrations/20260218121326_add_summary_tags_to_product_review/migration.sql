-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN     "summaryEn" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SeasonMaster" RENAME CONSTRAINT "Season_pkey" TO "SeasonMaster_pkey";

-- AlterTable
ALTER TABLE "SizeGroup" ALTER COLUMN "updatedAt" DROP DEFAULT;
