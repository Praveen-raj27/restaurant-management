-- CreateEnum
CREATE TYPE "WaiterAssignmentMode" AS ENUM ('OPEN', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "WaiterAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'ON_BREAK', 'OFFLINE');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PICKED_UP';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "pickedUpByMembershipId" UUID,
ADD COLUMN     "servedByMembershipId" UUID,
ADD COLUMN     "waiterMembershipId" UUID;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "waiterAssignmentMode" "WaiterAssignmentMode" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "RestaurantMembership" ADD COLUMN     "availabilityUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "waiterAvailability" "WaiterAvailability" NOT NULL DEFAULT 'OFFLINE';

-- AlterTable
ALTER TABLE "TableSession" ADD COLUMN     "assignedWaiterMembershipId" UUID;

-- CreateIndex
CREATE INDEX "Order_waiterMembershipId_status_idx" ON "Order"("waiterMembershipId", "status");

-- CreateIndex
CREATE INDEX "Order_pickedUpByMembershipId_idx" ON "Order"("pickedUpByMembershipId");

-- CreateIndex
CREATE INDEX "Order_servedByMembershipId_idx" ON "Order"("servedByMembershipId");

-- CreateIndex
CREATE INDEX "RestaurantMembership_restaurantId_waiterAvailability_idx" ON "RestaurantMembership"("restaurantId", "waiterAvailability");

-- CreateIndex
CREATE INDEX "TableSession_assignedWaiterMembershipId_status_idx" ON "TableSession"("assignedWaiterMembershipId", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterMembershipId_fkey" FOREIGN KEY ("waiterMembershipId") REFERENCES "RestaurantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickedUpByMembershipId_fkey" FOREIGN KEY ("pickedUpByMembershipId") REFERENCES "RestaurantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_servedByMembershipId_fkey" FOREIGN KEY ("servedByMembershipId") REFERENCES "RestaurantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_assignedWaiterMembershipId_fkey" FOREIGN KEY ("assignedWaiterMembershipId") REFERENCES "RestaurantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
