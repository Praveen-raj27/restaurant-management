import prisma from "../../config/prisma.js";
import crypto from "node:crypto";

export const createTable = async ({
  restaurantId,
  tableNumber,
  name,
  capacity,
}) => {
  // Generate a secure, unpredictable QR token.
  const qrToken = crypto.randomBytes(32).toString("hex");

  // Store only the hash, never the raw token.
  const qrTokenHash = crypto
    .createHash("sha256")
    .update(qrToken)
    .digest("hex");

  try {
    const table = await prisma.restaurantTable.create({
      data: {
        restaurantId,
        tableNumber,
        name,
        capacity,
        qrTokenHash,
      },
      select: {
        id: true,
        restaurantId: true,
        tableNumber: true,
        name: true,
        capacity: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      table,
      qrToken,
    };
  } catch (error) {
    // Table numbers must be unique within a restaurant.
    if (error.code === "P2002") {
      throw new Error("TABLE_NUMBER_ALREADY_EXISTS");
    }

    throw error;
  }
};

export const getTables = async ({
  restaurantId,
  page,
  limit,
  search,
  status,
  isActive,
}) => {
  const skip = (page - 1) * limit;

  const where = {
    restaurantId,
    ...(status && { status }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          tableNumber: Number.isInteger(Number(search))
            ? Number(search)
            : undefined,
        },
      ],
    }),
  };

  const [tables, total] = await prisma.$transaction([
    prisma.restaurantTable.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        tableNumber: "asc",
      },
      select: {
        id: true,
        tableNumber: true,
        name: true,
        capacity: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.restaurantTable.count({ where }),
  ]);

  return {
    tables,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getTableById = async ({ tableId, restaurantId }) => {
  const table = await prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurantId,
    },
    select: {
      id: true,
      restaurantId: true,
      tableNumber: true,
      name: true,
      capacity: true,
      status: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!table) {
    throw new Error("TABLE_NOT_FOUND");
  }

  return table;
};

export const updateTable = async ({
  tableId,
  restaurantId,
  data,
}) => {
  // Verify that the table belongs to this restaurant.
  const existingTable = await prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurantId,
    },
    select: {
      id: true,
    },
  });

  if (!existingTable) {
    throw new Error("TABLE_NOT_FOUND");
  }

  try {
    const updatedTable = await prisma.restaurantTable.update({
      where: {
        id: existingTable.id,
      },
      data,
      select: {
        id: true,
        restaurantId: true,
        tableNumber: true,
        name: true,
        capacity: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedTable;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("TABLE_NUMBER_ALREADY_EXISTS");
    }

    throw error;
  }
};

export const deleteTable = async ({ tableId, restaurantId }) => {
  const table = await prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurantId,
      isActive: true,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!table) {
    throw new Error("TABLE_NOT_FOUND");
  }

  if (table.status === "OCCUPIED") {
    throw new Error("TABLE_IS_OCCUPIED");
  }

  if (table.status === "RESERVED") {
    throw new Error("TABLE_IS_RESERVED");
  }

  const deletedTable = await prisma.restaurantTable.update({
    where: {
      id: table.id,
    },
    data: {
      isActive: false,
    },
    select: {
      id: true,
      tableNumber: true,
      name: true,
      isActive: true,
      status: true,
    },
  });

  return deletedTable;
};

export const rotateTableQrToken = async ({
  tableId,
  restaurantId,
}) => {
  const existingTable = await prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurantId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!existingTable) {
    throw new Error("TABLE_NOT_FOUND");
  }

  const qrToken = crypto.randomBytes(32).toString("hex");

  const qrTokenHash = crypto
    .createHash("sha256")
    .update(qrToken)
    .digest("hex");

  const updatedTable = await prisma.restaurantTable.update({
    where: {
      id: existingTable.id,
    },
    data: {
      qrTokenHash,
    },
    select: {
      id: true,
      tableNumber: true,
      name: true,
      capacity: true,
      status: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return {
    table: updatedTable,
    qrToken,
  };
};