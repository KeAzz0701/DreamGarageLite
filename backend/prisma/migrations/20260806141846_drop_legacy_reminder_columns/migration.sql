/*
  Warnings:

  - You are about to drop the column `oilChangeIntervalKm` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `oilChangeIntervalMonths` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `tireChangeIntervalKm` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `tireChangeIntervalMonths` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `oilReminderDismissedFor` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `tireReminderDismissedFor` on the `Vehicle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "oilChangeIntervalKm",
DROP COLUMN "oilChangeIntervalMonths",
DROP COLUMN "tireChangeIntervalKm",
DROP COLUMN "tireChangeIntervalMonths";

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "oilReminderDismissedFor",
DROP COLUMN "tireReminderDismissedFor";
