-- CreateTable
CREATE TABLE "CompanyAccount" (
    "id" SERIAL NOT NULL,
    "companyCode" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "dbName" TEXT NOT NULL,
    "lineChannelId" TEXT,
    "lineChannelSecret" TEXT,
    "lineChannelAccessToken" TEXT,
    "lineDestinationUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccount_companyCode_key" ON "CompanyAccount"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccount_dbName_key" ON "CompanyAccount"("dbName");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccount_lineDestinationUserId_key" ON "CompanyAccount"("lineDestinationUserId");
