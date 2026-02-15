-- CreateEnum
CREATE TYPE "ColorType" AS ENUM ('SOLID', 'PATTERN');

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "colorImage" TEXT,
    "appliedSeasonIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colorType" "ColorType" NOT NULL DEFAULT 'SOLID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Color_colorCode_idx" ON "Color"("colorCode");
