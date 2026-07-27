-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "portalPaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TireMeasurement" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "position" TEXT NOT NULL,
    "treadDepthMm" DOUBLE PRECISION NOT NULL,
    "mileage" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TireMeasurement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TireMeasurement" ADD CONSTRAINT "TireMeasurement_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

