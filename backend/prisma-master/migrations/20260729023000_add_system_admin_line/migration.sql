-- CreateTable
CREATE TABLE "SystemAdminLine" (
    "id" SERIAL NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAdminLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemAdminLine_lineUserId_key" ON "SystemAdminLine"("lineUserId");

