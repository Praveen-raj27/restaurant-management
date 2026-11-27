
import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";

export const createOrder = async ({
  restaurantId,
  tableId,
  createdById = null,
  source = "STAFF",
  data,
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Verify the table belongs to this restaurant.
    const table = await tx.restaurantTable.findFirst({
      where: {
        id: tableId,
        restaurantId,
        isActive: true,
      },
    });

    if (!table) {
      throw new Error("TABLE_NOT_FOUND");
    }

    if (table.status === "RESERVED") {
      throw new Error("TABLE_RESERVED");
    }

    // 2. Retrieve all requested menu items from the database.
    const menuItemIds = [
      ...new Set(data.items.map((item) => item.menuItemId)),
    ];

    const menuItems = await tx.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
        isActive: true,
        isAvailable: true,
      },
      include: {
        variants: true,
      },
    });

    const menuItemMap = new Map(
      menuItems.map((item) => [item.id, item]),
    );

    // 3. Validate items and calculate prices using database values.
    let subtotal = new Prisma.Decimal(0);

    const orderItems = data.items.map((requestedItem) => {
      const menuItem = menuItemMap.get(requestedItem.menuItemId);

      if (!menuItem) {
        throw new Error("MENU_ITEM_NOT_AVAILABLE");
      }

      let unitPrice;
      let variantId = null;
      let variantName = null;

      const hasVariants = menuItem.variants.length > 0;

      if (hasVariants) {
        if (!requestedItem.variantId) {
          throw new Error("VARIANT_REQUIRED");
        }

        const variant = menuItem.variants.find(
          (item) =>
            item.id === requestedItem.variantId &&
            item.isActive &&
            item.isAvailable,
        );

        if (!variant) {
          throw new Error("INVALID_OR_UNAVAILABLE_VARIANT");
        }

        unitPrice = new Prisma.Decimal(variant.price);
        variantId = variant.id;
        variantName = variant.name;
      } else {
        if (requestedItem.variantId) {
          throw new Error("VARIANT_NOT_ALLOWED");
        }

        if (menuItem.price === null) {
          throw new Error("MENU_ITEM_PRICE_NOT_CONFIGURED");
        }

        unitPrice = new Prisma.Decimal(menuItem.price);
      }

      const quantity = requestedItem.quantity;
      const totalPrice = unitPrice.mul(quantity);

      subtotal = subtotal.add(totalPrice);

      return {
        menuItemId: menuItem.id,
        variantId,
        itemName: menuItem.name,
        variantName,
        foodType: menuItem.foodType,
        quantity,
        unitPrice,
        totalPrice,
        notes: requestedItem.notes || null,
      };
    });

    // 4. Calculate the order total.
    // Tax and discount are zero for the current MVP.
    const taxAmount = new Prisma.Decimal(0);
    const discountAmount = new Prisma.Decimal(0);

    const totalAmount = subtotal
      .add(taxAmount)
      .sub(discountAmount);

    // 5. Create the order and its items.
    const order = await tx.order.create({
      data: {
        restaurantId,
        tableId,
        createdById,
        source,
        status: "PLACED",
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        currency: "INR",
        notes: data.notes || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        table: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
      },
    });

    // 6. Mark the table as occupied.
    await tx.restaurantTable.update({
      where: {
        id: table.id,
      },
      data: {
        status: "OCCUPIED",
      },
    });

    return order;
  });
};



export const markOrderAsServed = async ({
  restaurantId,
  orderId,
}) => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: {
        id: orderId,
        restaurantId,
        status: "READY",
      },
      data: {
        status: "SERVED",
        servedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          restaurantId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      throw new Error("ORDER_NOT_READY");
    }

    return tx.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
        items: true,
      },
    });
  });
};
