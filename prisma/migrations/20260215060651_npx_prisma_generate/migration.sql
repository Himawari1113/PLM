-- CreateEnum
CREATE TYPE "SampleMaterialKind" AS ENUM ('MAIN_FABRIC', 'SUB_FABRIC', 'SUB_MATERIAL');

-- AlterTable
ALTER TABLE "Sample" ADD COLUMN     "division" TEXT,
ADD COLUMN     "illustratorFile" TEXT,
ADD COLUMN     "patternCadFile" TEXT,
ADD COLUMN     "productOverride" TEXT,
ADD COLUMN     "seasonId" TEXT,
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "year" INTEGER;

-- CreateTable
CREATE TABLE "SampleColor" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeMaster" (
    "id" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleMeasurement" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "sizeMasterId" TEXT,
    "sizeCode" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleMaterial" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "kind" "SampleMaterialKind" NOT NULL,
    "materialCode" TEXT,
    "materialName" TEXT,
    "costPerUnit" DOUBLE PRECISION,
    "fabricSupplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleColor_colorId_idx" ON "SampleColor"("colorId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleColor_sampleId_colorId_key" ON "SampleColor"("sampleId", "colorId");

-- CreateIndex
CREATE INDEX "SizeMaster_division_subCategory_sortOrder_idx" ON "SizeMaster"("division", "subCategory", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SizeMaster_division_subCategory_sizeCode_key" ON "SizeMaster"("division", "subCategory", "sizeCode");

-- CreateIndex
CREATE INDEX "SampleMeasurement_sampleId_sizeCode_idx" ON "SampleMeasurement"("sampleId", "sizeCode");

-- CreateIndex
CREATE INDEX "SampleMeasurement_sizeMasterId_idx" ON "SampleMeasurement"("sizeMasterId");

-- CreateIndex
CREATE INDEX "SampleMaterial_sampleId_kind_idx" ON "SampleMaterial"("sampleId", "kind");

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleColor" ADD CONSTRAINT "SampleColor_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleColor" ADD CONSTRAINT "SampleColor_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleMeasurement" ADD CONSTRAINT "SampleMeasurement_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleMeasurement" ADD CONSTRAINT "SampleMeasurement_sizeMasterId_fkey" FOREIGN KEY ("sizeMasterId") REFERENCES "SizeMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleMaterial" ADD CONSTRAINT "SampleMaterial_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
