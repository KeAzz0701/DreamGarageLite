-- AlterTable
ALTER TABLE "CompanyAccount" ADD COLUMN     "staffJoinCode" TEXT;

-- CreateTable
CREATE TABLE "LineStaffLink" (
    "id" SERIAL NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "companyAccountId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineStaffLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineStaffLink_lineUserId_companyAccountId_key" ON "LineStaffLink"("lineUserId", "companyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccount_staffJoinCode_key" ON "CompanyAccount"("staffJoinCode");

-- AddForeignKey
ALTER TABLE "LineStaffLink" ADD CONSTRAINT "LineStaffLink_companyAccountId_fkey" FOREIGN KEY ("companyAccountId") REFERENCES "CompanyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

