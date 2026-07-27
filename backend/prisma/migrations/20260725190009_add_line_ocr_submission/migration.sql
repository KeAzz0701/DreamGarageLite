
-- CreateTable
CREATE TABLE "LineOcrSubmission" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "imageData" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "linkedVehicleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "LineOcrSubmission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LineOcrSubmission" ADD CONSTRAINT "LineOcrSubmission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

