-- CreateTable
CREATE TABLE "LineCompanyLink" (
    "id" SERIAL NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "companyAccountId" INTEGER NOT NULL,
    "tenantCustomerId" INTEGER NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineCompanyLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineCompanyLink_lineUserId_companyAccountId_key" ON "LineCompanyLink"("lineUserId", "companyAccountId");

-- AddForeignKey
ALTER TABLE "LineCompanyLink" ADD CONSTRAINT "LineCompanyLink_companyAccountId_fkey" FOREIGN KEY ("companyAccountId") REFERENCES "CompanyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
