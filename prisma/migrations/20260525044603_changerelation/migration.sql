-- DropForeignKey
ALTER TABLE `Warehouse` DROP FOREIGN KEY `Warehouse_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `Warehouse` DROP FOREIGN KEY `Warehouse_logistic_manager_id_fkey`;

-- DropForeignKey
ALTER TABLE `Warehouse` DROP FOREIGN KEY `Warehouse_updated_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `Warehouse` DROP FOREIGN KEY `Warehouse_warehouse_manager_id_fkey`;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_warehouse_manager_id_fkey` FOREIGN KEY (`warehouse_manager_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_logistic_manager_id_fkey` FOREIGN KEY (`logistic_manager_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
