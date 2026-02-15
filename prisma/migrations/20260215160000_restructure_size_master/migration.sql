-- Restructure SizeMaster: subCategory -> sizeGroup, add sizeName

-- Step 1: Add new columns with defaults
ALTER TABLE "SizeMaster" ADD COLUMN "sizeGroup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SizeMaster" ADD COLUMN "sizeName" TEXT NOT NULL DEFAULT '';

-- Step 2: Copy subCategory data into sizeGroup
UPDATE "SizeMaster" SET "sizeGroup" = "subCategory";

-- Step 3: Drop old unique/index constraints
DROP INDEX IF EXISTS "SizeMaster_division_subCategory_sizeCode_key";
DROP INDEX IF EXISTS "SizeMaster_division_subCategory_sortOrder_idx";

-- Step 4: Drop old column
ALTER TABLE "SizeMaster" DROP COLUMN "subCategory";

-- Step 5: Create new constraints
CREATE UNIQUE INDEX "SizeMaster_division_sizeGroup_sizeCode_key" ON "SizeMaster"("division", "sizeGroup", "sizeCode");
CREATE INDEX "SizeMaster_division_sizeGroup_sortOrder_idx" ON "SizeMaster"("division", "sizeGroup", "sortOrder");
