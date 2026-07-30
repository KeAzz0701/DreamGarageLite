-- AlterTable
ALTER TABLE "EstimateItem" ADD COLUMN     "laborCost" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ServiceHistoryItem" ADD COLUMN     "laborCost" INTEGER NOT NULL DEFAULT 0;
