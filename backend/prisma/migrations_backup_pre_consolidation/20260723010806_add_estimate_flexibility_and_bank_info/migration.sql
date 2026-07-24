ALTER TABLE "Estimate" ADD COLUMN     "customerId" INTEGER,
ADD COLUMN     "customerNameFreeText" TEXT,
ADD COLUMN     "vehicleDescription" TEXT,
ALTER COLUMN "vehicleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EstimateItem" ADD COLUMN     "isFee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ServiceHistoryItem" ADD COLUMN     "isFee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankAccountType" TEXT,
ADD COLUMN     "bankBranchName" TEXT,
ADD COLUMN     "bankName" TEXT;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

