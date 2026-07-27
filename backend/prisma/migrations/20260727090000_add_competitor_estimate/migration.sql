-- CreateTable
CREATE TABLE "CompetitorEstimate" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "imageData" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "shopName" TEXT,
    "estimateDate" TEXT,
    "items" JSONB,
    "totalAmount" INTEGER,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "sharedWithShop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorEstimate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompetitorEstimate" ADD CONSTRAINT "CompetitorEstimate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorEstimate" ADD CONSTRAINT "CompetitorEstimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

