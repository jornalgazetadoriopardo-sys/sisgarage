-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'STORE_OWNER', 'STORE_STAFF') NOT NULL DEFAULT 'STORE_STAFF',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `storeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(64) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginAttempt_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `LoginAttempt_ip_createdAt_idx`(`ip`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Store` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `cnpj` VARCHAR(14) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `whatsapp` VARCHAR(20) NULL,
    `instagram` VARCHAR(60) NULL,
    `openingHours` VARCHAR(200) NULL,
    `zipCode` VARCHAR(8) NULL,
    `address` VARCHAR(200) NULL,
    `city` VARCHAR(80) NOT NULL,
    `state` CHAR(2) NOT NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `watermarkEnabled` BOOLEAN NOT NULL DEFAULT false,
    `watermarkUrl` VARCHAR(255) NULL,
    `watermarkPosition` ENUM('BOTTOM_RIGHT', 'BOTTOM_LEFT', 'TOP_RIGHT', 'TOP_LEFT', 'CENTER') NOT NULL DEFAULT 'BOTTOM_RIGHT',
    `watermarkSize` INTEGER NOT NULL DEFAULT 22,
    `watermarkOpacity` INTEGER NOT NULL DEFAULT 80,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Store_slug_key`(`slug`),
    UNIQUE INDEX `Store_cnpj_key`(`cnpj`),
    INDEX `Store_status_idx`(`status`),
    INDEX `Store_city_state_idx`(`city`, `state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `type` ENUM('CAR', 'MOTORCYCLE', 'TRUCK', 'OTHER') NOT NULL DEFAULT 'CAR',
    `brand` VARCHAR(60) NOT NULL,
    `model` VARCHAR(80) NOT NULL,
    `version` VARCHAR(140) NULL,
    `yearManufacture` SMALLINT NOT NULL,
    `yearModel` SMALLINT NOT NULL,
    `mileage` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(12, 2) NOT NULL,
    `previousPrice` DECIMAL(12, 2) NULL,
    `color` VARCHAR(40) NULL,
    `fuel` ENUM('FLEX', 'GASOLINE', 'ETHANOL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'GNV') NOT NULL DEFAULT 'FLEX',
    `transmission` ENUM('MANUAL', 'AUTOMATIC', 'CVT', 'AUTOMATED') NOT NULL DEFAULT 'MANUAL',
    `doors` TINYINT NULL,
    `engine` VARCHAR(30) NULL,
    `plate` VARCHAR(7) NULL,
    `renavam` VARCHAR(11) NULL,
    `chassis` VARCHAR(17) NULL,
    `description` TEXT NULL,
    `status` ENUM('PREPARING', 'AVAILABLE', 'RESERVED', 'SOLD') NOT NULL DEFAULT 'PREPARING',
    `published` BOOLEAN NOT NULL DEFAULT false,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `featuredLabel` VARCHAR(40) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `views` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vehicle_published_status_idx`(`published`, `status`),
    INDEX `Vehicle_storeId_position_idx`(`storeId`, `position`),
    INDEX `Vehicle_brand_model_idx`(`brand`, `model`),
    INDEX `Vehicle_price_idx`(`price`),
    UNIQUE INDEX `Vehicle_storeId_plate_key`(`storeId`, `plate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleFeature` (
    `vehicleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    INDEX `VehicleFeature_name_idx`(`name`),
    PRIMARY KEY (`vehicleId`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehiclePhoto` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `thumbUrl` VARCHAR(255) NOT NULL,
    `originalPath` VARCHAR(255) NOT NULL,
    `width` INTEGER NOT NULL DEFAULT 0,
    `height` INTEGER NOT NULL DEFAULT 0,
    `watermarked` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VehiclePhoto_vehicleId_position_idx`(`vehicleId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Lead_storeId_createdAt_idx`(`storeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleFeature` ADD CONSTRAINT `VehicleFeature_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehiclePhoto` ADD CONSTRAINT `VehiclePhoto_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
