-- Drop the existing unique index
DROP INDEX "RestaurantTable_restaurantId_tableNumber_key";

-- Allow duplicate table numbers only when older records are inactive
CREATE UNIQUE INDEX "RestaurantTable_active_restaurantId_tableNumber_key"
ON "RestaurantTable" ("restaurantId", "tableNumber")
WHERE "isActive" = true;