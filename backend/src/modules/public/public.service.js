
import prisma from "../../config/prisma.js";
import crypto from "node:crypto";
import { getOrOpenTableSession } from "../table-sessions/table-session.service.js";
import { Prisma } from "@prisma/client";
import { withTransactionRetry } from "../../utils/transaction.utils.js";
import { getIO } from "../../config/socket.js";

const hashQrToken = (qrToken) =>
  crypto.createHash("sha256").update(qrToken).digest("hex");

const findTableByQrToken = async (qrToken) => {
  if (!qrToken || typeof qrToken !== "string") {
    throw new Error("INVALID_QR_TOKEN");
  }

  const qrTokenHash = hashQrToken(qrToken);

  const table = await prisma.restaurantTable.findFirst({
    where: {
      qrTokenHash,
      isActive: true,
      restaurant: {
        status: "ACTIVE",
      },
    },
    select: {
      id: true,
      tableNumber: true,
      name: true,
      capacity: true,
      status: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          timezone: true,
        },
      },
    },
  });

  if (!table) {
    throw new Error("INVALID_QR_TOKEN");
  }

  return table;
};

export const validateTableQrToken = async (qrToken) => {
  const table = await findTableByQrToken(qrToken);

  return {
    restaurant: table.restaurant,
    table: {
      id: table.id,
      tableNumber: table.tableNumber,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
    },
  };
};

export const getPublicMenuByQrToken = async (qrToken) => {
  const table = await findTableByQrToken(qrToken);

  // Automatically open a session or reuse the existing one.
  const activeSession = await getOrOpenTableSession({
    restaurantId: table.restaurant.id,
    tableId: table.id,
  });

  const categories = await prisma.menuCategory.findMany({
    where: {
      restaurantId: table.restaurant.id,
      isActive: true,
      menuItems: {
        some: {
          isActive: true,
          isAvailable: true,
          OR: [
            { variants: { none: {} } },
            {
              variants: {
                some: {
                  isActive: true,
                  isAvailable: true,
                },
              },
            },
          ],
        },
      },
    },
    orderBy: {
      displayOrder: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      displayOrder: true,
      menuItems: {
        where: {
          isActive: true,
          isAvailable: true,
          OR: [
            { variants: { none: {} } },
            {
              variants: {
                some: {
                  isActive: true,
                  isAvailable: true,
                },
              },
            },
          ],
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          foodType: true,
          price: true,
          preparationTime: true,
          variants: {
            where: {
              isActive: true,
              isAvailable: true,
            },
            orderBy: {
              displayOrder: "asc",
            },
            select: {
              id: true,
              name: true,
              price: true,
              displayOrder: true,
            },
          },
        },
      },
    },
  });

  return {
    restaurant: table.restaurant,
    table: {
      id: table.id,
      tableNumber: table.tableNumber,
      name: table.name,
      capacity: table.capacity,
      status: "OCCUPIED",
      hasOpenSession: true,
      sessionId: activeSession.id,
    },
    categories,
  };
};




export const placeGuestOrder = async ({
  qrToken,
  items,
  notes,
  idempotencyKey,
}) => {
  if (!qrToken || typeof qrToken !== "string") {
    throw new Error("INVALID_QR_TOKEN");
  }

  if (
    !idempotencyKey ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length > 100
  ) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }

  const qrTokenHash = hashQrToken(qrToken);

  // Use the same response structure for existing and new orders.
  const orderInclude = {
    items: true,
    table: {
      select: {
        id: true,
        tableNumber: true,
        name: true,
      },
    },
  };

  // 1. Check whether this checkout request was already processed.
  const existingOrder = await prisma.order.findUnique({
    where: {
      idempotencyKey,
    },
    include: orderInclude,
  });

  if (existingOrder) {
    return existingOrder;
  }

  let order;

  try {
    // 2. Create the order transactionally.
    order = await withTransactionRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const table = await tx.restaurantTable.findFirst({
            where: {
              qrTokenHash,
              isActive: true,
              restaurant: {
                status: "ACTIVE",
              },
            },
            select: {
              id: true,
              restaurantId: true,
              tableNumber: true,
              status: true,
              restaurant: {
                select: {
                  currency: true,
                },
              },
            },
          });

          if (!table) {
            throw new Error("INVALID_QR_TOKEN");
          }

          if (table.status !== "OCCUPIED") {
            throw new Error("TABLE_NOT_OCCUPIED");
          }

          const session = await tx.tableSession.findFirst({
            where: {
              restaurantId: table.restaurantId,
              tableId: table.id,
              status: "OPEN",
            },
            select: {
              id: true,
            },
          });

          if (!session) {
            throw new Error("OPEN_SESSION_NOT_FOUND");
          }

          const menuItemIds = [
            ...new Set(items.map((item) => item.menuItemId)),
          ];

          const menuItems = await tx.menuItem.findMany({
            where: {
              id: {
                in: menuItemIds,
              },
              restaurantId: table.restaurantId,
              isActive: true,
              isAvailable: true,
              category: {
                isActive: true,
              },
            },
            include: {
              variants: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  isActive: true,
                  isAvailable: true,
                },
              },
            },
          });

          if (menuItems.length !== menuItemIds.length) {
            throw new Error("INVALID_OR_UNAVAILABLE_MENU_ITEM");
          }

          const menuItemMap = new Map(
            menuItems.map((item) => [item.id, item]),
          );

          let subtotal = new Prisma.Decimal(0);

          const orderItems = items.map((requestedItem) => {
            const menuItem = menuItemMap.get(
              requestedItem.menuItemId,
            );

            if (!menuItem) {
              throw new Error("INVALID_OR_UNAVAILABLE_MENU_ITEM");
            }

            let selectedVariant = null;
            let unitPrice;

            if (menuItem.variants.length > 0) {
              if (!requestedItem.variantId) {
                throw new Error("VARIANT_REQUIRED");
              }

              selectedVariant = menuItem.variants.find(
                (variant) =>
                  variant.id === requestedItem.variantId,
              );

              if (
                !selectedVariant ||
                !selectedVariant.isActive ||
                !selectedVariant.isAvailable
              ) {
                throw new Error("INVALID_OR_UNAVAILABLE_VARIANT");
              }

              unitPrice = selectedVariant.price;
            } else {
              if (requestedItem.variantId) {
                throw new Error("INVALID_VARIANT_FOR_MENU_ITEM");
              }

              if (menuItem.price === null) {
                throw new Error("MENU_ITEM_PRICE_NOT_CONFIGURED");
              }

              unitPrice = menuItem.price;
            }

            const totalPrice = new Prisma.Decimal(
              unitPrice.toString(),
            ).mul(requestedItem.quantity);

            subtotal = subtotal.add(totalPrice);

            return {
              menuItemId: menuItem.id,
              variantId: selectedVariant?.id ?? null,
              itemName: menuItem.name,
              variantName: selectedVariant?.name ?? null,
              foodType: menuItem.foodType,
              quantity: requestedItem.quantity,
              unitPrice,
              totalPrice,
              notes: requestedItem.notes || null,
            };
          });

          const createdOrder = await tx.order.create({
            data: {
              restaurantId: table.restaurantId,
              tableId: table.id,
              sessionId: session.id,
              source: "QR",
              status: "PLACED",
              idempotencyKey,
              subtotal,
              taxAmount: new Prisma.Decimal(0),
              discountAmount: new Prisma.Decimal(0),
              totalAmount: subtotal,
              currency: table.restaurant.currency,
              notes: notes || null,
              items: {
                create: orderItems,
              },
            },
            include: orderInclude,
          });

          return createdOrder;
        },
        {
          isolationLevel: "Serializable",
        },
      ),
    );
  } catch (error) {
    // 3. Another simultaneous request may have created this order.
    // Recover the original order instead of creating a duplicate.
    try {
      const duplicateOrder = await prisma.order.findUnique({
        where: {
          idempotencyKey,
        },
        include: orderInclude,
      });

      if (duplicateOrder) {
        return duplicateOrder;
      }
    } catch (lookupError) {
      console.error(
        "Failed to recover idempotent guest order:",
        lookupError,
      );
    }

    throw error;
  }

  // 4. Emit only for a newly created order, after transaction commit.
  try {
    getIO()
      .to(`restaurant:${order.restaurantId}`)
      .emit("order:new", order);
  } catch (error) {
    console.error("Failed to emit new order event:", error);
  }

  return order;
};


