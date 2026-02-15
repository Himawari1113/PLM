-- Add materialCode to Material, create MaterialColor join table

-- Step 1: Add materialCode column
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "materialCode" TEXT;

-- Step 2: Populate materialCode from name
UPDATE "Material" SET "materialCode" = 'MAT-' || LPAD(SUBSTRING(id, 1, 6), 6, '0')
WHERE "materialCode" IS NULL;

-- Step 3: Create MaterialColor table
CREATE TABLE IF NOT EXISTS "MaterialColor" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialColor_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add foreign keys
ALTER TABLE "MaterialColor" ADD CONSTRAINT "MaterialColor_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaterialColor" ADD CONSTRAINT "MaterialColor_colorId_fkey"
  FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "MaterialColor_materialId_colorId_key"
  ON "MaterialColor"("materialId", "colorId");
