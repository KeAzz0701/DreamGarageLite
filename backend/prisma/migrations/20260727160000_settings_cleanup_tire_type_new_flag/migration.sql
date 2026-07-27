-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "apiUrl",
DROP COLUMN "autoUpdate",
DROP COLUMN "backupEnabled",
DROP COLUMN "geminiEndpoint";

-- AlterTable
ALTER TABLE "TireMeasurement" ADD COLUMN     "isNewTire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tireType" TEXT NOT NULL DEFAULT 'SUMMER';

