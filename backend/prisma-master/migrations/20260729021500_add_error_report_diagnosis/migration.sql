-- AlterTable
ALTER TABLE "ErrorReport" ADD COLUMN     "diagnosedAt" TIMESTAMP(3),
ADD COLUMN     "diagnosisNote" TEXT,
ADD COLUMN     "diagnosisSuggestedFix" TEXT;

