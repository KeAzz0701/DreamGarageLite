-- CreateTable
CREATE TABLE "PortalSubscriber" (
    "lineUserId" TEXT NOT NULL,
    "portalPaid" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSubscriber_pkey" PRIMARY KEY ("lineUserId")
);

