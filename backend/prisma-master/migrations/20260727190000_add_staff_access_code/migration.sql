-- AlterTable
ALTER TABLE "LineStaffLink" ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "staffAccessCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LineStaffLink_staffAccessCode_key" ON "LineStaffLink"("staffAccessCode");
