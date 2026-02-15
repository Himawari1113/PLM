-- Separate SizeGroup into its own master table

-- Step 1: Create SizeGroup table
CREATE TABLE IF NOT EXISTS "SizeGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "divisionId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SizeGroup_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add foreign key from SizeGroup to DivisionMaster
ALTER TABLE "SizeGroup" ADD CONSTRAINT "SizeGroup_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "DivisionMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: Add unique constraint on SizeGroup
CREATE UNIQUE INDEX "SizeGroup_divisionId_name_key" ON "SizeGroup"("divisionId", "name");
CREATE INDEX "SizeGroup_divisionId_sortOrder_idx" ON "SizeGroup"("divisionId", "sortOrder");

-- Step 4: Populate SizeGroup from existing SizeMaster data
INSERT INTO "SizeGroup" ("id", "name", "divisionId", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::TEXT,
    sm."sizeGroup",
    CASE
        WHEN sm."division" = 'Mens' THEN 1
        WHEN sm."division" = 'Womens' THEN 2
        WHEN sm."division" IN ('Kids', 'Kids/Baby') THEN 3
        ELSE 1
    END,
    true,
    0,
    NOW(),
    NOW()
FROM (SELECT DISTINCT "sizeGroup", "division" FROM "SizeMaster") sm
ON CONFLICT DO NOTHING;

-- Step 5: Add sizeGroupId column to SizeMaster
ALTER TABLE "SizeMaster" ADD COLUMN "sizeGroupId" TEXT;

-- Step 6: Populate sizeGroupId by matching division + sizeGroup name
UPDATE "SizeMaster" sm
SET "sizeGroupId" = sg."id"
FROM "SizeGroup" sg
JOIN "DivisionMaster" dm ON dm."id" = sg."divisionId"
WHERE sg."name" = sm."sizeGroup"
  AND (
    dm."name" = sm."division"
    OR (sm."division" = 'Kids' AND dm."name" = 'Kids/Baby')
  );

-- Step 7: For any orphaned rows without a match, create a default SizeGroup
INSERT INTO "SizeGroup" ("id", "name", "divisionId", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::TEXT, 'Unassigned', 1, true, 999, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "SizeMaster" WHERE "sizeGroupId" IS NULL)
ON CONFLICT DO NOTHING;

UPDATE "SizeMaster"
SET "sizeGroupId" = (SELECT "id" FROM "SizeGroup" WHERE "name" = 'Unassigned' LIMIT 1)
WHERE "sizeGroupId" IS NULL;

-- Step 8: Make sizeGroupId NOT NULL
ALTER TABLE "SizeMaster" ALTER COLUMN "sizeGroupId" SET NOT NULL;

-- Step 9: Add foreign key from SizeMaster to SizeGroup
ALTER TABLE "SizeMaster" ADD CONSTRAINT "SizeMaster_sizeGroupId_fkey" FOREIGN KEY ("sizeGroupId") REFERENCES "SizeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Drop old columns and indexes
DROP INDEX IF EXISTS "SizeMaster_division_sizeGroup_sizeCode_key";
DROP INDEX IF EXISTS "SizeMaster_division_sizeGroup_sortOrder_idx";
ALTER TABLE "SizeMaster" DROP COLUMN IF EXISTS "division";
ALTER TABLE "SizeMaster" DROP COLUMN IF EXISTS "sizeGroup";

-- Step 11: Create new indexes for SizeMaster
CREATE UNIQUE INDEX "SizeMaster_sizeGroupId_sizeCode_key" ON "SizeMaster"("sizeGroupId", "sizeCode");
CREATE INDEX "SizeMaster_sizeGroupId_sortOrder_idx" ON "SizeMaster"("sizeGroupId", "sortOrder");
