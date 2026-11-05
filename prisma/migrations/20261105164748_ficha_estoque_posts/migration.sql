-- AlterTable
ALTER TABLE `Store` ADD COLUMN `brandColor` VARCHAR(7) NULL;

-- CreateTable
CREATE TABLE `PriceHistory` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PriceHistory_vehicleId_changedAt_idx`(`vehicleId`, `changedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PriceHistory` ADD CONSTRAINT `PriceHistory_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Preço atual de cada veículo vira o primeiro registro do histórico
INSERT INTO `PriceHistory` (`id`, `vehicleId`, `price`, `userName`, `changedAt`)
SELECT CONCAT('ph', `id`), `id`, `price`, 'Cadastro', `createdAt` FROM `Vehicle`;
