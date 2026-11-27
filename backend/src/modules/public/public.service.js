
import prisma from "../../config/prisma.js";
import crypto from "node:crypto";
import { getOrOpenTableSession } from "../table-sessions/table-session.service.js";

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
