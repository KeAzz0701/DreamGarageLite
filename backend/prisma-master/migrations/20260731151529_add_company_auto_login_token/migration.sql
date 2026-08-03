-- CreateTable
CREATE TABLE "CompanyAutoLoginToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "companyAccountId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAutoLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAutoLoginToken_token_key" ON "CompanyAutoLoginToken"("token");

-- AddForeignKey
ALTER TABLE "CompanyAutoLoginToken" ADD CONSTRAINT "CompanyAutoLoginToken_companyAccountId_fkey" FOREIGN KEY ("companyAccountId") REFERENCES "CompanyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
