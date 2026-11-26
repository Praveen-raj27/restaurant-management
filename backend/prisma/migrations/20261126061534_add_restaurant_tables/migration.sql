-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'INACTIVE');

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "qrTokenHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_qrTokenHash_key" ON "RestaurantTable"("qrTokenHash");

-- CreateIndex
CREATE INDEX "RestaurantTable_restaurantId_status_idx" ON "RestaurantTable"("restaurantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_restaurantId_tableNumber_key" ON "RestaurantTable"("restaurantId", "tableNumber");

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
