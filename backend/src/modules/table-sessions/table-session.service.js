
import prisma from "../../config/prisma.js";
import { withTransactionRetry } from "../../utils/transaction.utils.js";

// Staff manually opens a table session.
export const openTableSession = async ({
  restaurantId,
  tableId,
  openedById,
}) => {
  return withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const table = await tx.restaurantTable.findFirst({
          where: {
            id: tableId,
            restaurantId,
            isActive: true,
          },
          select: {
            id: true,
            status: true,
            tableNumber: true,
          },
        });

        if (!table) throw new Error("TABLE_NOT_FOUND");
        if (table.status === "RESERVED") {
          throw new Error("TABLE_IS_RESERVED");
        }

        const existingSession = await tx.tableSession.findFirst({
          where: {
            tableId: table.id,
            restaurantId,
            status: "OPEN",
          },
          select: { id: true },
        });

        if (existingSession) {
          throw new Error("TABLE_SESSION_ALREADY_OPEN");
        }

        if (table.status !== "AVAILABLE") {
          throw new Error("TABLE_NOT_AVAILABLE");
        }

        const tableUpdate = await tx.restaurantTable.updateMany({
          where: {
            id: table.id,
            restaurantId,
            isActive: true,
            status: "AVAILABLE",
          },
          data: { status: "OCCUPIED" },
        });

        if (tableUpdate.count === 0) {
          throw new Error("TABLE_NOT_AVAILABLE");
        }

        return tx.tableSession.create({
          data: {
            restaurantId,
            tableId: table.id,
            openedById,
          },
          include: {
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
      { isolationLevel: "Serializable" },
    ),
  );
};

// QR guest opens a session automatically or reuses an existing one.
export const getOrOpenTableSession = async ({
  restaurantId,
  tableId,
}) => {
  return withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const table = await tx.restaurantTable.findFirst({
          where: {
            id: tableId,
            restaurantId,
            isActive: true,
          },
          select: {
            id: true,
            status: true,
            tableNumber: true,
          },
        });

        if (!table) throw new Error("TABLE_NOT_FOUND");

        if (table.status === "RESERVED") {
          throw new Error("TABLE_IS_RESERVED");
        }

        // Reuse the session if staff or another guest already opened it.
        const existingSession = await tx.tableSession.findFirst({
          where: {
            tableId: table.id,
            restaurantId,
            status: "OPEN",
          },
          include: {
            table: {
              select: {
                id: true,
                tableNumber: true,
                name: true,
              },
            },
          },
        });

        if (existingSession) {
          return existingSession;
        }

        if (table.status !== "AVAILABLE") {
          throw new Error("TABLE_NOT_AVAILABLE");
        }

        // Atomically claim the table before creating the session.
        const tableUpdate = await tx.restaurantTable.updateMany({
          where: {
            id: table.id,
            restaurantId,
            isActive: true,
            status: "AVAILABLE",
          },
          data: {
            status: "OCCUPIED",
          },
        });

        if (tableUpdate.count === 0) {
          throw new Error("TABLE_NOT_AVAILABLE");
        }

        return tx.tableSession.create({
          data: {
            restaurantId,
            tableId: table.id,
            openedById: null,
          },
          include: {
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
      { isolationLevel: "Serializable" },
    ),
  );
};

// Staff closes a table session.
export const closeTableSession = async ({
  restaurantId,
  tableId,
  closedById,
}) => {
  return withTransactionRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const session = await tx.tableSession.findFirst({
          where: {
            restaurantId,
            tableId,
            status: "OPEN",
          },
          include: {
            table: {
              select: {
                id: true,
                status: true,
                isActive: true,
              },
            },
          },
        });

        if (!session) {
          throw new Error("OPEN_SESSION_NOT_FOUND");
        }

        const unfinishedOrder = await tx.order.findFirst({
          where: {
            restaurantId,
            tableId,
            status: {
              in: ["PLACED", "PREPARING", "READY"],
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (unfinishedOrder) {
          throw new Error("SESSION_HAS_UNFINISHED_ORDERS");
        }

        const closedSession = await tx.tableSession.update({
          where: { id: session.id },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
            closedById,
          },
        });

        await tx.restaurantTable.update({
          where: { id: session.table.id },
          data: { status: "AVAILABLE" },
        });

        return closedSession;
      },
      { isolationLevel: "Serializable" },
    ),
  );
};
