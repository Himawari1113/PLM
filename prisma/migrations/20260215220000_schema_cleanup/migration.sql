-- =============================================================
-- 1. Season → SeasonMaster: rename table, drop year, rename term→seasonName, add seasonCode
-- =============================================================

-- Rename the table
ALTER TABLE "Season" RENAME TO "SeasonMaster";

-- Rename term → seasonName
ALTER TABLE "SeasonMaster" RENAME COLUMN "term" TO "seasonName";

-- Add seasonCode column (nullable first to populate)
ALTER TABLE "SeasonMaster" ADD COLUMN "seasonCode" INTEGER;

-- Populate seasonCode: SS=1, FW=2
UPDATE "SeasonMaster" SET "seasonCode" = CASE
  WHEN "seasonName" = 'SS' THEN 1
  WHEN "seasonName" = 'FW' THEN 2
  ELSE 0
END;

-- Make seasonCode NOT NULL and UNIQUE
ALTER TABLE "SeasonMaster" ALTER COLUMN "seasonCode" SET NOT NULL;
CREATE UNIQUE INDEX "SeasonMaster_seasonCode_key" ON "SeasonMaster"("seasonCode");

-- Drop year column
ALTER TABLE "SeasonMaster" DROP COLUMN "year";

-- Rename the unique index on name (update from Season_name_key)
ALTER INDEX IF EXISTS "Season_name_key" RENAME TO "SeasonMaster_name_key";

-- =============================================================
-- 2. DivisionMaster: add divisionCode
-- =============================================================

ALTER TABLE "DivisionMaster" ADD COLUMN "divisionCode" INTEGER;

-- Set divisionCode: 1=Kids/Baby, 2=Womens, 3=Mens
UPDATE "DivisionMaster" SET "divisionCode" = CASE
  WHEN "name" = 'Kids/Baby' THEN 1
  WHEN "name" = 'Womens' THEN 2
  WHEN "name" = 'Mens' THEN 3
  ELSE 0
END;

ALTER TABLE "DivisionMaster" ALTER COLUMN "divisionCode" SET NOT NULL;
ALTER TABLE "DivisionMaster" ALTER COLUMN "divisionCode" SET DEFAULT 0;
CREATE UNIQUE INDEX "DivisionMaster_divisionCode_key" ON "DivisionMaster"("divisionCode");

-- =============================================================
-- 3. Sample: make sampleNumber UNIQUE, drop color/measurements/sewingSpec/factoryName, add mainFactoryCode
-- =============================================================

-- Add unique constraint on sampleNumber
CREATE UNIQUE INDEX "Sample_sampleNumber_key" ON "Sample"("sampleNumber");

-- Drop removed columns
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "color";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "measurements";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "sewingSpec";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "factoryName";

-- Add mainFactoryCode
ALTER TABLE "Sample" ADD COLUMN "mainFactoryCode" TEXT;

-- =============================================================
-- 4. Fix FK references: Collection, TrendItem, Sample all point to Season → SeasonMaster
--    (The FK constraints reference the table name, not the model name, so they should still work
--     after the rename. But we need to update any FK constraint names if Prisma expects them.)
-- =============================================================
-- No FK rename needed since PostgreSQL follows the table through rename automatically.
