-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `assignedToId` VARCHAR(191) NULL,
    ADD COLUMN `lostReason` VARCHAR(200) NULL,
    ADD COLUMN `nextFollowUp` DATE NULL,
    ADD COLUMN `source` ENUM('SITE', 'WHATSAPP', 'PHONE', 'WALK_IN', 'INSTAGRAM', 'REFERRAL', 'OTHER') NOT NULL DEFAULT 'SITE',
    ADD COLUMN `status` ENUM('NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST') NOT NULL DEFAULT 'NEW',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `LeadNote` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadNote_leadId_createdAt_idx`(`leadId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialEntry` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `dueDate` DATE NOT NULL,
    `paidAt` DATE NULL,
    `groupId` VARCHAR(30) NULL,
    `notes` VARCHAR(255) NULL,
    `fileRef` VARCHAR(255) NULL,
    `fileName` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FinancialEntry_storeId_dueDate_idx`(`storeId`, `dueDate`),
    INDEX `FinancialEntry_storeId_paidAt_idx`(`storeId`, `paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appointment` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEST_DRIVE', 'VISIT', 'INSPECTION', 'DISPATCHER', 'WORKSHOP', 'DELIVERY', 'OTHER') NOT NULL,
    `status` ENUM('REQUESTED', 'SCHEDULED', 'DONE', 'NO_SHOW', 'CANCELED') NOT NULL DEFAULT 'SCHEDULED',
    `startsAt` DATETIME(3) NOT NULL,
    `durationMin` INTEGER NOT NULL DEFAULT 60,
    `title` VARCHAR(120) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `leadId` VARCHAR(191) NULL,
    `contactName` VARCHAR(120) NULL,
    `contactPhone` VARCHAR(20) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Appointment_storeId_startsAt_idx`(`storeId`, `startsAt`),
    INDEX `Appointment_storeId_status_idx`(`storeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Lead_storeId_status_idx` ON `Lead`(`storeId`, `status`);

-- AddForeignKey
ALTER TABLE `LeadNote` ADD CONSTRAINT `LeadNote_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialEntry` ADD CONSTRAINT `FinancialEntry_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
