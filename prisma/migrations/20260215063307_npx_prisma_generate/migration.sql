-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "divisionId" INTEGER;

-- CreateTable
CREATE TABLE "DivisionMaster" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivisionMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DivisionMaster_name_key" ON "DivisionMaster"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "DivisionMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
