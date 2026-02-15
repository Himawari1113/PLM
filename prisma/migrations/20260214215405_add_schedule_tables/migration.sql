-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "scheduleDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleMilestoneAssignment" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleMilestoneAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_scheduleDate_key" ON "Schedule"("scheduleDate");

-- CreateIndex
CREATE INDEX "ScheduleMilestoneAssignment_milestoneId_idx" ON "ScheduleMilestoneAssignment"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleMilestoneAssignment_scheduleId_milestoneId_key" ON "ScheduleMilestoneAssignment"("scheduleId", "milestoneId");

-- AddForeignKey
ALTER TABLE "ScheduleMilestoneAssignment" ADD CONSTRAINT "ScheduleMilestoneAssignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleMilestoneAssignment" ADD CONSTRAINT "ScheduleMilestoneAssignment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
