CREATE TABLE "OtbPlanning" (
    "id" TEXT NOT NULL,
    "styleNumber" TEXT NOT NULL,
    "styleName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "season" INTEGER NOT NULL DEFAULT 1,
    "divisionName" TEXT NOT NULL DEFAULT '',
    "totalPlanQty" INTEGER NOT NULL DEFAULT 0,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "salesQty" INTEGER NOT NULL DEFAULT 0,
    "storeInvQty" INTEGER NOT NULL DEFAULT 0,
    "whInvQty" INTEGER NOT NULL DEFAULT 0,
    "intakeQty" INTEGER NOT NULL DEFAULT 0,
    "otb" INTEGER NOT NULL DEFAULT 0,
    "salesStartDate" DATE,
    "finalAllocDate" DATE,
    "salesEndDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OtbPlanning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OtbPlanning_styleNumber_weekNumber_year_key" ON "OtbPlanning"("styleNumber", "weekNumber", "year");
CREATE INDEX "OtbPlanning_year_idx" ON "OtbPlanning"("year");
CREATE INDEX "OtbPlanning_styleNumber_idx" ON "OtbPlanning"("styleNumber");

CREATE TABLE "FinancialPlanning" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seasonCode" INTEGER NOT NULL DEFAULT 1,
    "divisionName" TEXT NOT NULL DEFAULT '',
    "month" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gmPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ebita" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventory" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialPlanning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialPlanning_year_seasonCode_divisionName_month_key" ON "FinancialPlanning"("year", "seasonCode", "divisionName", "month");
CREATE INDEX "FinancialPlanning_year_seasonCode_idx" ON "FinancialPlanning"("year", "seasonCode");
