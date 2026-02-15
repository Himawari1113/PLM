-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleMilestoneProgress" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleMilestoneProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleMilestoneProgress_milestoneId_idx" ON "SampleMilestoneProgress"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleMilestoneProgress_sampleId_milestoneId_key" ON "SampleMilestoneProgress"("sampleId", "milestoneId");

-- AddForeignKey
ALTER TABLE "SampleMilestoneProgress" ADD CONSTRAINT "SampleMilestoneProgress_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleMilestoneProgress" ADD CONSTRAINT "SampleMilestoneProgress_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
