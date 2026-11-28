
import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";
import { withTransactionRetry } from "../../utils/transaction.utils.js";

export const createOrder = async ({
  restaurantId,
  tableId,
  createdById = null,
  source = "STAFF",
  data,
}) => {
  return withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        // 1. Verify table belongs to this restaurant and is active.
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

        // 2. Resolve the active session server-side.
        const session = await tx.tableSession.findFirst({
          where: {
            tableId: table.id,
            restaurantId,
            status: "OPEN",
          },
          select: { id: true },
        });

        if (!session) {
          throw new Error("ACTIVE_TABLE_SESSION_REQUIRED");
        }

        // 3. Load menu items from this restaurant.
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

        // 4. Validate items and calculate prices from database values.
        const orderItems = data.items.map((item) => {
          const menuItem = menuItemMap.get(item.menuItemId);

          if (!menuItem) {
            throw new Error("MENU_ITEM_NOT_AVAILABLE");
          }

          const hasVariants = menuItem.variants.length > 0;
          let selectedVariant = null;
          let unitPrice = Number(menuItem.price);

          if (hasVariants) {
            if (!item.variantId) {
              throw new Error("VARIANT_REQUIRED");
            }

            selectedVariant = menuItem.variants.find(
              (variant) =>
                variant.id === item.variantId && variant.isActive,
            );

            if (!selectedVariant) {
              throw new Error("INVALID_OR_UNAVAILABLE_VARIANT");
            }

            unitPrice = Number(selectedVariant.price);
          } else if (item.variantId) {
            throw new Error("VARIANT_NOT_ALLOWED");
          }

          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error("MENU_ITEM_PRICE_NOT_CONFIGURED");
          }

          const quantity = item.quantity;
          const totalPrice = unitPrice * quantity;

          return {
            menuItemId: menuItem.id,
            variantId: selectedVariant?.id || null,
            itemName: menuItem.name,
            variantName: selectedVariant?.name || null,
            quantity,
            unitPrice,
            totalPrice,
            notes: item.notes || null,
          };
        });

        // 5. Calculate totals.
        const subtotal = orderItems.reduce(
          (sum, item) => sum + item.totalPrice,
          0,
        );

        const taxAmount = 0;
        const discountAmount = 0;
        const totalAmount = subtotal + taxAmount - discountAmount;

        // 6. Create order linked to the active table session.
        const order = await tx.order.create({
          data: {
            restaurantId,
            tableId,
            sessionId: session.id,
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

        // 7. Ensure the table remains occupied.
        await tx.restaurantTable.update({
          where: { id: table.id },
          data: { status: "OCCUPIED" },
        });

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ),
  );
};

export const markOrderAsServed = async ({
  restaurantId,
  orderId,
}) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.status !== "READY") {
      throw new Error("ORDER_NOT_READY");
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: "SERVED",
        servedAt: new Date(),
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
  });
};

export const getTotalOrders = async ({ restaurantId }) => {
  return prisma.order.count({
    where: {
      restaurantId,
    },
  });
};


export const getRecentOrders = async ({ restaurantId }) => {
  return prisma.order.findMany({
    where: {
      restaurantId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      items: {
        select: {
          itemName: true,
          quantity: true,
        },
      },
      table: {
        select: {
          tableNumber: true,
          name: true,
        },
      },
    },
  });
};
