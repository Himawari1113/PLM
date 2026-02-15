/*
  Warnings:

  - You are about to drop the column `appliedSeasonIds` on the `Color` table. All the data in the column will be lost.
  - Added the required column `colorName` to the `Color` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Color" DROP COLUMN "appliedSeasonIds",
ADD COLUMN     "colorName" TEXT NOT NULL,
ADD COLUMN     "pantoneCode" TEXT;

-- CreateIndex
CREATE INDEX "Color_colorName_idx" ON "Color"("colorName");
