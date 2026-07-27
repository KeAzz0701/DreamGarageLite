-- AlterTable
ALTER TABLE "ServiceHistory" ADD COLUMN     "category" TEXT,
ADD COLUMN     "mileage" INTEGER;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "oilChangeIntervalKm" INTEGER,
ADD COLUMN     "oilChangeIntervalMonths" INTEGER,
ADD COLUMN     "tireChangeIntervalKm" INTEGER,
ADD COLUMN     "tireChangeIntervalMonths" INTEGER;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "oilReminderDismissedFor" TEXT,
ADD COLUMN     "tireReminderDismissedFor" TEXT;

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
