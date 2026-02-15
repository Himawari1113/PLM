-- Add subCategory column to SizeGroup
ALTER TABLE "SizeGroup" ADD COLUMN "subCategory" TEXT;

-- Populate subCategory from existing name (which is the category/sub-category)
UPDATE "SizeGroup" SET "subCategory" = "name";

-- Create index for filtering
CREATE INDEX "SizeGroup_divisionId_subCategory_idx" ON "SizeGroup"("divisionId", "subCategory");
