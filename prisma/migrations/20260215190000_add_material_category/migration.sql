-- Add MaterialCategory enum and column to Material

-- Step 1: Create the enum type
DO $$ BEGIN
  CREATE TYPE "MaterialCategory" AS ENUM ('MAIN_FABRIC', 'SUB_FABRIC', 'SUB_MATERIAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add nullable column
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "materialCategory" "MaterialCategory";

-- Step 3: Populate based on existing type and name
UPDATE "Material" SET "materialCategory" = 'MAIN_FABRIC'
WHERE "type" = 'FABRIC' AND "name" ILIKE '%Main%';

UPDATE "Material" SET "materialCategory" = 'SUB_FABRIC'
WHERE "type" = 'FABRIC' AND "materialCategory" IS NULL;

UPDATE "Material" SET "materialCategory" = 'SUB_MATERIAL'
WHERE "type" IN ('TRIM', 'PACKAGING', 'OTHER');
