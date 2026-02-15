-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('PROTO', 'SALES_SAMPLE', 'PP_SAMPLE', 'TOP', 'OTHER');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CostStatus" AS ENUM ('ESTIMATING', 'QUOTED', 'NEGOTIATING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "sampleName" TEXT NOT NULL,
    "sampleNumber" TEXT NOT NULL,
    "sampleType" "SampleType" NOT NULL DEFAULT 'PROTO',
    "status" "SampleStatus" NOT NULL DEFAULT 'PENDING',
    "sizeSpec" TEXT,
    "color" TEXT,
    "remarks" TEXT,
    "imageUrl" TEXT,
    "measurements" TEXT,
    "sewingSpec" TEXT,
    "factoryName" TEXT,
    "dueDate" TIMESTAMP(3),
    "shippingDestination" TEXT,
    "fittingComment" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cost" (
    "id" TEXT NOT NULL,
    "costVersion" TEXT NOT NULL,
    "status" "CostStatus" NOT NULL DEFAULT 'ESTIMATING',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fobPrice" DECIMAL(10,2),
    "materialCost" DECIMAL(10,2),
    "processingCost" DECIMAL(10,2),
    "trimCost" DECIMAL(10,2),
    "profitMargin" DOUBLE PRECISION,
    "moq" INTEGER,
    "leadTimeDays" INTEGER,
    "remarks" TEXT,
    "sampleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
