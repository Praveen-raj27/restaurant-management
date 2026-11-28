
import prisma from "../../config/prisma.js";
import { withTransactionRetry } from "../../utils/transaction.utils.js";
import { getIO } from "../../config/socket.js";

const emitWaiterOrderUpdate = ({
  restaurantId,
  order,
}) => {
  try {
    const io = getIO();

    // Notify all restaurant clients.
    io.to(`restaurant:${restaurantId}`)
      .emit("order:updated", order);

    // Notify the assigned waiter privately.
    if (order.waiterMembershipId) {
      io.to(`membership:${order.waiterMembershipId}`)
        .emit("waiter:order:updated", order);
    }
  } catch (error) {
    console.error("Failed to emit waiter order update:", error);
  }
};

export const getWaiters = async ({ restaurantId }) => {
  return prisma.restaurantMembership.findMany({
    where: {
      restaurantId,
      status: "ACTIVE",
      role: {
        is: {
          name: "WAITER",
        },
      },
    },
    select: {
      id: true,
      status: true,
      waiterAvailability: true,
      availabilityUpdatedAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};


export const updateWaiterAvailability = async ({
  restaurantId,
  membershipId,
  availability,
  actorRole,
  actorMembershipId,
}) => {
  const waiter = await prisma.restaurantMembership.findFirst({
    where: {
      id: membershipId,
      restaurantId,
      status: "ACTIVE",
      role: {
        is: {
          name: "WAITER",
        },
      },
    },
  });

  if (!waiter) {
    throw new Error("WAITER_NOT_FOUND");
  }

  // Waiters can update only their own availability.
  if (
    actorRole === "WAITER" &&
    waiter.id !== actorMembershipId
  ) {
    throw new Error("FORBIDDEN");
  }

  return prisma.restaurantMembership.update({
    where: {
      id: waiter.id,
    },
    data: {
      waiterAvailability: availability,
      availabilityUpdatedAt: new Date(),
    },
    select: {
      id: true,
      waiterAvailability: true,
      availabilityUpdatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};


// Assign or reassign a waiter to an open table session.

export const assignWaiterToSession = async ({
  restaurantId,
  sessionId,
  waiterMembershipId,
}) => {
  const result = await withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const restaurant = await tx.restaurant.findUnique({
          where: { id: restaurantId },
          select: {
            waiterAssignmentMode: true,
          },
        });

        if (!restaurant) {
          throw new Error("RESTAURANT_NOT_FOUND");
        }

        if (restaurant.waiterAssignmentMode !== "ASSIGNED") {
          throw new Error("ASSIGNED_MODE_REQUIRED");
        }

        const session = await tx.tableSession.findFirst({
          where: {
            id: sessionId,
            restaurantId,
            status: "OPEN",
          },
          select: {
            id: true,
            assignedWaiterMembershipId: true,
            table: {
              select: {
                id: true,
                tableNumber: true,
                name: true,
              },
            },
          },
        });

        if (!session) {
          throw new Error("OPEN_SESSION_NOT_FOUND");
        }

        const waiter = await tx.restaurantMembership.findFirst({
          where: {
            id: waiterMembershipId,
            restaurantId,
            status: "ACTIVE",
            waiterAvailability: {
              in: ["AVAILABLE", "BUSY"],
            },
            role: {
              is: {
                name: "WAITER",
              },
            },
          },
          select: {
            id: true,
            waiterAvailability: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!waiter) {
          throw new Error("WAITER_NOT_AVAILABLE");
        }

        const updatedSession = await tx.tableSession.update({
          where: {
            id: session.id,
          },
          data: {
            assignedWaiterMembershipId: waiter.id,
          },
          select: {
            id: true,
            assignedWaiterMembershipId: true,
            table: {
              select: {
                id: true,
                tableNumber: true,
                name: true,
              },
            },
          },
        });

        await tx.order.updateMany({
          where: {
            restaurantId,
            sessionId: session.id,
            status: {
              in: ["PLACED", "PREPARING", "READY"],
            },
          },
          data: {
            waiterMembershipId: waiter.id,
          },
        });

        return {
          ...updatedSession,
          previousWaiterMembershipId:
            session.assignedWaiterMembershipId,
          assignedWaiter: waiter,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    ),
  );

  // Notify clients only after the transaction commits.
  try {
    const io = getIO();

    if (
      result.previousWaiterMembershipId &&
      result.previousWaiterMembershipId !==
        result.assignedWaiterMembershipId
    ) {
      io.to(`membership:${result.previousWaiterMembershipId}`)
        .emit("waiter:session:unassigned", result);
    }

    io.to(`membership:${result.assignedWaiterMembershipId}`)
      .emit("waiter:session:assigned", result);

    io.to(`restaurant:${restaurantId}`)
      .emit("waiter:session:updated", result);
  } catch (error) {
    console.error("Failed to emit waiter assignment update:", error);
  }

  return result;
};



// Get orders assigned to a waiter.
export const getWaiterOrders = async ({
  restaurantId,
  membershipId,
}) => {
  const [restaurant, waiter] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        waiterAssignmentMode: true,
      },
    }),

    prisma.restaurantMembership.findFirst({
      where: {
        id: membershipId,
        restaurantId,
        status: "ACTIVE",
        role: {
          is: {
            name: "WAITER",
          },
        },
      },
      select: {
        id: true,
        waiterAvailability: true,
      },
    }),
  ]);

  if (!restaurant) {
    throw new Error("RESTAURANT_NOT_FOUND");
  }

  if (!waiter) {
    throw new Error("WAITER_NOT_FOUND");
  }

  const includeUnclaimedOrders =
    restaurant.waiterAssignmentMode === "OPEN" &&
    waiter.waiterAvailability === "AVAILABLE";

  return prisma.order.findMany({
    where: {
      restaurantId,
      OR: [
        {
          waiterMembershipId: membershipId,
          status: {
            in: [
              "PLACED",
              "PREPARING",
              "READY",
              "PICKED_UP",
            ],
          },
        },

        ...(includeUnclaimedOrders
          ? [
              {
                waiterMembershipId: null,
                status: "READY",
              },
            ]
          : []),
      ],
    },

    orderBy: {
      createdAt: "asc",
    },

    include: {
      items: {
        select: {
          id: true,
          itemName: true,
          variantName: true,
          quantity: true,
          notes: true,
        },
      },

      table: {
        select: {
          id: true,
          tableNumber: true,
          name: true,
        },
      },

      session: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
};


export const claimWaiterOrder = async ({
  restaurantId,
  orderId,
  membershipId,
}) => {
  const updatedOrder = await withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const restaurant = await tx.restaurant.findUnique({
          where: { id: restaurantId },
          select: { waiterAssignmentMode: true },
        });

        if (!restaurant) {
          throw new Error("RESTAURANT_NOT_FOUND");
        }

        if (restaurant.waiterAssignmentMode !== "OPEN") {
          throw new Error("OPEN_MODE_REQUIRED");
        }

        const waiter = await tx.restaurantMembership.findFirst({
          where: {
            id: membershipId,
            restaurantId,
            status: "ACTIVE",
            waiterAvailability: "AVAILABLE",
            role: {
              is: { name: "WAITER" },
            },
          },
          select: { id: true },
        });

        if (!waiter) {
          throw new Error("WAITER_NOT_AVAILABLE");
        }

        const order = await tx.order.findFirst({
          where: {
            id: orderId,
            restaurantId,
            status: "READY",
          },
          select: {
            id: true,
            waiterMembershipId: true,
          },
        });

        if (!order) {
          throw new Error("ORDER_NOT_READY");
        }

        if (order.waiterMembershipId) {
          throw new Error("ORDER_ALREADY_ASSIGNED");
        }

        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            restaurantId,
            status: "READY",
            waiterMembershipId: null,
          },
          data: {
            waiterMembershipId: waiter.id,
          },
        });

        if (result.count !== 1) {
          throw new Error("ORDER_ALREADY_ASSIGNED");
        }

        return tx.order.findUnique({
          where: { id: order.id },
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
      },
      {
        isolationLevel: "Serializable",
      },
    ),
  );

  emitWaiterOrderUpdate({ restaurantId, order: updatedOrder });

  return updatedOrder;
};


export const pickupWaiterOrder = async ({
  restaurantId,
  orderId,
  membershipId,
}) => {
  const updatedOrder = await withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: orderId,
            restaurantId,
            status: "READY",
            waiterMembershipId: membershipId,
          },
          select: { id: true },
        });

        if (!order) {
          throw new Error("ORDER_NOT_ASSIGNED_OR_READY");
        }

        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            restaurantId,
            status: "READY",
            waiterMembershipId: membershipId,
          },
          data: {
            status: "PICKED_UP",
            pickedUpByMembershipId: membershipId,
            pickedUpAt: new Date(),
          },
        });

        if (result.count !== 1) {
          throw new Error("ORDER_PICKUP_CONFLICT");
        }

        return tx.order.findUnique({
          where: { id: order.id },
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
      },
      {
        isolationLevel: "Serializable",
      },
    ),
  );

  emitWaiterOrderUpdate({ restaurantId, order: updatedOrder });

  return updatedOrder;
};



export const serveWaiterOrder = async ({
  restaurantId,
  orderId,
  membershipId,
}) => {
  const updatedOrder = await withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: orderId,
            restaurantId,
            status: "PICKED_UP",
            pickedUpByMembershipId: membershipId,
          },
          select: { id: true },
        });

        if (!order) {
          throw new Error("ORDER_NOT_PICKED_UP_BY_YOU");
        }

        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            restaurantId,
            status: "PICKED_UP",
            pickedUpByMembershipId: membershipId,
          },
          data: {
            status: "SERVED",
            servedByMembershipId: membershipId,
            servedAt: new Date(),
          },
        });

        if (result.count !== 1) {
          throw new Error("ORDER_SERVE_CONFLICT");
        }

        return tx.order.findUnique({
          where: { id: order.id },
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
      },
      {
        isolationLevel: "Serializable",
      },
    ),
  );

  emitWaiterOrderUpdate({ restaurantId, order: updatedOrder });

  return updatedOrder;
};