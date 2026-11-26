-- AlterTable
ALTER TABLE "MenuItem" ALTER COLUMN "price" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MenuItemVariant" (
    "id" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemVariant_menuItemId_isActive_idx" ON "MenuItemVariant"("menuItemId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemVariant_menuItemId_name_key" ON "MenuItemVariant"("menuItemId", "name");

-- AddForeignKey
ALTER TABLE "MenuItemVariant" ADD CONSTRAINT "MenuItemVariant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
