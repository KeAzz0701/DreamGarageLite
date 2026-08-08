-- CreateTable
CREATE TABLE "PlanHistory" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "fromPlan" "Plan",
    "toPlan" "Plan" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlanHistory" ADD CONSTRAINT "PlanHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
