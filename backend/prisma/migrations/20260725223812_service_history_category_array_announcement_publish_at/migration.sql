-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceHistory" DROP COLUMN "category",
ADD COLUMN     "category" TEXT[];
