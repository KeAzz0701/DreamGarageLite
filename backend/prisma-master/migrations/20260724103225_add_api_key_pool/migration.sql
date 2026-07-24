-- CreateTable
CREATE TABLE "ApiKeyPool" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GEMINI',
    "apiKey" TEXT NOT NULL,
    "companyAccountId" INTEGER,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyPool_apiKey_key" ON "ApiKeyPool"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyPool_companyAccountId_key" ON "ApiKeyPool"("companyAccountId");

-- AddForeignKey
ALTER TABLE "ApiKeyPool" ADD CONSTRAINT "ApiKeyPool_companyAccountId_fkey" FOREIGN KEY ("companyAccountId") REFERENCES "CompanyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
