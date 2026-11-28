
import prisma from "../../config/prisma.js";
import { getIO } from "../../config/socket.js";

export const getKitchenOrders = async ({ restaurantId }) => {
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: {
        in: ["PLACED", "PREPARING", "READY"],
      },
    },
    include: {
      table: {
        select: {
          id: true,
          tableNumber: true,
          name: true,
        },
      },
      items: {
        select: {
          id: true,
          menuItemId: true,
          itemName: true,
          variantName: true,
          foodType: true,
          quantity: true,
          notes: true,
        },
      },
    },
    orderBy: {
      placedAt: "asc",
    },
    take: 100,
  });

  return orders;
};



export const updateKitchenOrderStatus = async ({
  restaurantId,
  orderId,
  status,
}) => {
  // Update order inside the transaction.
  const updatedOrder = await prisma.$transaction(async (tx) => {
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

    const allowedTransitions = {
      PLACED: "PREPARING",
      PREPARING: "READY",
    };

    if (allowedTransitions[order.status] !== status) {
      throw new Error("INVALID_ORDER_STATUS_TRANSITION");
    }

    const timestamp = new Date();

    const result = await tx.order.updateMany({
      where: {
        id: orderId,
        restaurantId,
        status: order.status,
      },
      data: {
        status,
        ...(status === "PREPARING" && {
          preparingAt: timestamp,
        }),
        ...(status === "READY" && {
          readyAt: timestamp,
        }),
      },
    });

    if (result.count === 0) {
      throw new Error("INVALID_ORDER_STATUS_TRANSITION");
    }

    return tx.order.findUnique({
      where: {
        id: orderId,
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

  // Broadcast only after successful transaction commit.
  try {
    getIO()
      .to(`restaurant:${restaurantId}`)
      .emit("order:updated", updatedOrder);
  } catch (error) {
    console.error("Failed to emit order update:", error);
  }

  return updatedOrder;
};
