import prisma from "../../config/prisma.js";
import crypto from "node:crypto";

export const validateTableQrToken = async (qrToken) => {
  if (!qrToken || typeof qrToken !== "string") {
    throw new Error("INVALID_QR_TOKEN");
  }

  const qrTokenHash = crypto
    .createHash("sha256")
    .update(qrToken)
    .digest("hex");

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