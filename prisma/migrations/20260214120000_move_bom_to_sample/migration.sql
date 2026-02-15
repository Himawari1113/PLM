-- Delete existing BomItem data (was linked to Product, now needs Sample)
DELETE FROM "BomItem";

-- Drop old foreign key and unique constraint
ALTER TABLE "BomItem" DROP CONSTRAINT IF EXISTS "BomItem_productId_fkey";
ALTER TABLE "BomItem" DROP CONSTRAINT IF EXISTS "BomItem_productId_materialId_key";

-- Drop old column
ALTER TABLE "BomItem" DROP COLUMN IF EXISTS "productId";

-- Add new column
ALTER TABLE "BomItem" ADD COLUMN "sampleId" TEXT NOT NULL;

-- Add foreign key
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint
CREATE UNIQUE INDEX "BomItem_sampleId_materialId_key" ON "BomItem"("sampleId", "materialId");
