-- AlterTable
ALTER TABLE `Store` ADD COLUMN `legalName` VARCHAR(150) NULL;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `document` VARCHAR(14) NULL,
    `rg` VARCHAR(20) NULL,
    `birthDate` DATE NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(191) NULL,
    `zipCode` VARCHAR(8) NULL,
    `address` VARCHAR(200) NULL,
    `district` VARCHAR(80) NULL,
    `city` VARCHAR(80) NULL,
    `state` CHAR(2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_storeId_name_idx`(`storeId`, `name`),
    UNIQUE INDEX `Customer_storeId_document_key`(`storeId`, `document`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NULL,
    `sellerName` VARCHAR(100) NOT NULL,
    `status` ENUM('RESERVED', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'COMPLETED',
    `date` DATE NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `commission` DECIMAL(12, 2) NULL,
    `warrantyDays` INTEGER NOT NULL DEFAULT 90,
    `mileageAtSale` INTEGER NULL,
    `notes` TEXT NULL,
    `tradeInVehicleId` VARCHAR(191) NULL,
    `canceledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Sale_storeId_date_idx`(`storeId`, `date`),
    INDEX `Sale_vehicleId_idx`(`vehicleId`),
    UNIQUE INDEX `Sale_storeId_number_key`(`storeId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalePayment` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `method` ENUM('PIX', 'CASH', 'TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'FINANCING', 'TRADE_IN', 'PROMISSORY', 'OTHER') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `details` VARCHAR(200) NULL,
    `dueDate` DATE NULL,
    `paidAt` DATE NULL,

    INDEX `SalePayment_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_tradeInVehicleId_fkey` FOREIGN KEY (`tradeInVehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalePayment` ADD CONSTRAINT `SalePayment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
