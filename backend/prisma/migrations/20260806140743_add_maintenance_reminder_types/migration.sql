-- CreateTable
CREATE TABLE "MaintenanceReminderType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "intervalMonths" INTEGER,
    "intervalKm" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceReminderType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceReminderDismissal" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "reminderTypeId" INTEGER NOT NULL,
    "dismissedFor" TEXT NOT NULL,

    CONSTRAINT "MaintenanceReminderDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReminderType_name_key" ON "MaintenanceReminderType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReminderDismissal_vehicleId_reminderTypeId_key" ON "MaintenanceReminderDismissal"("vehicleId", "reminderTypeId");

-- AddForeignKey
ALTER TABLE "MaintenanceReminderDismissal" ADD CONSTRAINT "MaintenanceReminderDismissal_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReminderDismissal" ADD CONSTRAINT "MaintenanceReminderDismissal_reminderTypeId_fkey" FOREIGN KEY ("reminderTypeId") REFERENCES "MaintenanceReminderType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
