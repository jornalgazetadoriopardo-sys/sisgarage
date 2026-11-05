-- AlterTable
ALTER TABLE `Vehicle` ADD COLUMN `fipeBrandCode` VARCHAR(12) NULL,
    ADD COLUMN `fipeCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `fipeCode` VARCHAR(12) NULL,
    ADD COLUMN `fipeModelCode` VARCHAR(12) NULL,
    ADD COLUMN `fipeName` VARCHAR(200) NULL,
    ADD COLUMN `fipeReference` VARCHAR(40) NULL,
    ADD COLUMN `fipeType` VARCHAR(12) NULL,
    ADD COLUMN `fipeValue` DECIMAL(12, 2) NULL,
    ADD COLUMN `fipeYearCode` VARCHAR(12) NULL,
    ADD COLUMN `purchaseDate` DATE NULL,
    ADD COLUMN `purchaseFrom` VARCHAR(120) NULL,
    ADD COLUMN `purchaseNotes` TEXT NULL,
    ADD COLUMN `purchasePayment` VARCHAR(120) NULL,
    ADD COLUMN `purchasePrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `purchaseSource` ENUM('PERSON', 'DEALER', 'AUCTION', 'TRADE_IN', 'OTHER') NULL;

-- CreateTable
CREATE TABLE `VehicleExpense` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `category` ENUM('MECHANICS', 'BODYWORK', 'TIRES', 'DETAILING', 'ELECTRICAL', 'DISPATCHER', 'TRANSFER', 'INSPECTION', 'TRANSPORT', 'COMMISSION', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `date` DATE NOT NULL,
    `supplier` VARCHAR(120) NULL,
    `fileRef` VARCHAR(255) NULL,
    `fileName` VARCHAR(160) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VehicleExpense_vehicleId_date_idx`(`vehicleId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleDocument` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `type` ENUM('CRLV', 'ATPV', 'CAUTELAR', 'INSPECTION', 'POWER_OF_ATTORNEY', 'SPARE_KEY', 'MANUAL', 'OWNER_ID', 'OTHER') NOT NULL,
    `label` VARCHAR(80) NULL,
    `status` ENUM('PENDING', 'OK', 'NOT_APPLICABLE') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATE NULL,
    `notes` VARCHAR(255) NULL,
    `fileRef` VARCHAR(255) NULL,
    `fileName` VARCHAR(160) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VehicleDocument_vehicleId_idx`(`vehicleId`),
    INDEX `VehicleDocument_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleTax` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `kind` ENUM('IPVA', 'LICENSING', 'FINE', 'OTHER') NOT NULL,
    `description` VARCHAR(200) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `dueDate` DATE NULL,
    `paidAt` DATE NULL,
    `fileRef` VARCHAR(255) NULL,
    `fileName` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VehicleTax_vehicleId_idx`(`vehicleId`),
    INDEX `VehicleTax_paidAt_dueDate_idx`(`paidAt`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FipeHistory` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `month` CHAR(7) NOT NULL,
    `reference` VARCHAR(40) NOT NULL,
    `value` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FipeHistory_vehicleId_month_key`(`vehicleId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(100) NOT NULL,
    `asAdmin` BOOLEAN NOT NULL DEFAULT false,
    `action` VARCHAR(60) NOT NULL,
    `entity` VARCHAR(40) NULL,
    `entityId` VARCHAR(40) NULL,
    `details` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_storeId_createdAt_idx`(`storeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VehicleExpense` ADD CONSTRAINT `VehicleExpense_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleDocument` ADD CONSTRAINT `VehicleDocument_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleTax` ADD CONSTRAINT `VehicleTax_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FipeHistory` ADD CONSTRAINT `FipeHistory_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
