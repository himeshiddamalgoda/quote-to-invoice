-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SALES', 'MANAGER', 'FINANCE', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `email` VARCHAR(254) NULL,
    `phone` VARCHAR(40) NULL,
    `billingAddress` TEXT NULL,
    `taxIdentifier` VARCHAR(80) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` CHAR(36) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quotation` (
    `id` CHAR(36) NOT NULL,
    `number` VARCHAR(40) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `customerName` VARCHAR(200) NOT NULL,
    `customerEmail` VARCHAR(254) NULL,
    `billingAddress` TEXT NULL,
    `taxIdentifier` VARCHAR(80) NULL,
    `quotationDate` DATE NOT NULL,
    `validUntil` DATE NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `subtotal` DECIMAL(19, 2) NOT NULL,
    `discountAmount` DECIMAL(19, 2) NOT NULL DEFAULT 0,
    `taxRate` DECIMAL(7, 4) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 2) NOT NULL,
    `total` DECIMAL(19, 2) NOT NULL,
    `paymentTerms` TEXT NULL,
    `notes` TEXT NULL,
    `termsAndConditions` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT_TO_CUSTOMER', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Quotation_number_key`(`number`),
    INDEX `Quotation_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `Quotation_status_validUntil_idx`(`status`, `validUntil`),
    INDEX `Quotation_createdById_createdAt_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationItem` (
    `id` CHAR(36) NOT NULL,
    `quotationId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NULL,
    `position` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `quantity` DECIMAL(15, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `discountAmount` DECIMAL(19, 2) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(19, 2) NOT NULL,

    INDEX `QuotationItem_productId_idx`(`productId`),
    UNIQUE INDEX `QuotationItem_quotationId_position_key`(`quotationId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationApproval` (
    `id` CHAR(36) NOT NULL,
    `quotationId` CHAR(36) NOT NULL,
    `approverId` CHAR(36) NOT NULL,
    `quotationVersion` INTEGER NOT NULL,
    `action` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `QuotationApproval_quotationId_createdAt_idx`(`quotationId`, `createdAt`),
    INDEX `QuotationApproval_approverId_idx`(`approverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProformaInvoice` (
    `id` CHAR(36) NOT NULL,
    `number` VARCHAR(40) NOT NULL,
    `sourceQuotationId` CHAR(36) NOT NULL,
    `sourceQuotationVersion` INTEGER NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `customerName` VARCHAR(200) NOT NULL,
    `customerEmail` VARCHAR(254) NULL,
    `billingAddress` TEXT NULL,
    `taxIdentifier` VARCHAR(80) NULL,
    `invoiceDate` DATE NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `subtotal` DECIMAL(19, 2) NOT NULL,
    `discountAmount` DECIMAL(19, 2) NOT NULL,
    `taxRate` DECIMAL(7, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 2) NOT NULL,
    `total` DECIMAL(19, 2) NOT NULL,
    `paymentTerms` TEXT NULL,
    `notes` TEXT NULL,
    `termsAndConditions` TEXT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `issuedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProformaInvoice_number_key`(`number`),
    UNIQUE INDEX `ProformaInvoice_sourceQuotationId_key`(`sourceQuotationId`),
    INDEX `ProformaInvoice_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `ProformaInvoice_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ProformaInvoice_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProformaInvoiceItem` (
    `id` CHAR(36) NOT NULL,
    `proformaInvoiceId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NULL,
    `position` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `quantity` DECIMAL(15, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `discountAmount` DECIMAL(19, 2) NOT NULL,
    `lineTotal` DECIMAL(19, 2) NOT NULL,

    INDEX `ProformaInvoiceItem_productId_idx`(`productId`),
    UNIQUE INDEX `ProformaInvoiceItem_proformaInvoiceId_position_key`(`proformaInvoiceId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `action` ENUM('QUOTATION_CREATED', 'QUOTATION_UPDATED', 'QUOTATION_SUBMITTED', 'QUOTATION_APPROVED', 'QUOTATION_REJECTED', 'QUOTATION_REOPENED', 'QUOTATION_SENT', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'QUOTATION_EXPIRED', 'PROFORMA_CREATED', 'PROFORMA_ISSUED', 'PROFORMA_CANCELLED') NOT NULL,
    `entity` VARCHAR(60) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_createdAt_idx`(`entity`, `entityId`, `createdAt`),
    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSequence` (
    `kind` ENUM('QT', 'PI') NOT NULL,
    `year` INTEGER NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`kind`, `year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationApproval` ADD CONSTRAINT `QuotationApproval_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationApproval` ADD CONSTRAINT `QuotationApproval_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_sourceQuotationId_fkey` FOREIGN KEY (`sourceQuotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceItem` ADD CONSTRAINT `ProformaInvoiceItem_proformaInvoiceId_fkey` FOREIGN KEY (`proformaInvoiceId`) REFERENCES `ProformaInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceItem` ADD CONSTRAINT `ProformaInvoiceItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
