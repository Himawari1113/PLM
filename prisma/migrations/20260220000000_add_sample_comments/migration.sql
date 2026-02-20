-- CreateTable
CREATE TABLE "SampleComment" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleComment_sampleId_idx" ON "SampleComment"("sampleId");

-- CreateIndex
CREATE INDEX "SampleComment_createdAt_idx" ON "SampleComment"("createdAt");

-- AddForeignKey
ALTER TABLE "SampleComment" ADD CONSTRAINT "SampleComment_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
