
import {
  openTableSession,
  closeTableSession,
} from "./table-session.service.js";

const handleSessionError = (error, res, next) => {
  const errors = {
    TABLE_NOT_FOUND: [404, "Table not found"],
    TABLE_IS_RESERVED: [409, "Reserved tables cannot be opened"],
    TABLE_NOT_AVAILABLE: [409, "Table is not available"],
    TABLE_SESSION_ALREADY_OPEN: [
      409,
      "An active session already exists for this table",
    ],
    OPEN_SESSION_NOT_FOUND: [404, "No open session found for this table"],
    SESSION_HAS_UNFINISHED_ORDERS: [
      409,
      "Cannot close session while orders are unfinished",
    ],
  };

  const result = errors[error.message];

  if (result) {
    return res.status(result[0]).json({
      success: false,
      message: result[1],
    });
  }

  return next(error);
};

export const openSession = async (req, res, next) => {
  try {
    const session = await openTableSession({
      restaurantId: req.user.restaurantId,
      tableId: req.validatedBody.tableId,
      openedById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Table session opened successfully",
      data: session,
    });
  } catch (error) {
    handleSessionError(error, res, next);
  }
};

export const closeSession = async (req, res, next) => {
  try {
    const session = await closeTableSession({
      restaurantId: req.user.restaurantId,
      tableId: req.validatedBody.tableId,
      closedById: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Table session closed successfully",
      data: session,
    });
  } catch (error) {
    handleSessionError(error, res, next);
  }
};
