-- AlterTable
ALTER TABLE "ErrorReport" ADD COLUMN     "diagnosisVerdict" TEXT,
ADD COLUMN     "diagnosisVerdictAt" TIMESTAMP(3);
