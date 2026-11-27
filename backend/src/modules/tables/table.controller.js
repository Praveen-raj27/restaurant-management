import {
  createTable as createTableService,
  getTables,
  getTableById,
  updateTable as updateTableService,
  deleteTable as deleteTableService,
  rotateTableQrToken,
  updateTableStatus as updateTableStatusService,
} from "./table.service.js";

export const createTable = async (req, res, next) => {
  try {
    const { tableNumber, name, capacity } = req.validatedBody;

    const result = await createTableService({
      restaurantId: req.user.restaurantId,
      tableNumber,
      name,
      capacity,
    });

    return res.status(201).json({
      success: true,
      message: "Table created successfully",
      data: {
        ...result.table,
        qrToken: result.qrToken,
      },
    });
  } catch (error) {
    if (error.message === "TABLE_NUMBER_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A table with this number already exists in this restaurant",
      });
    }

    next(error);
  }
};

export const listTables = async (req, res, next) => {
  try {
    const result = await getTables({
      restaurantId: req.user.restaurantId,
      ...req.validatedQuery,
    });

    return res.status(200).json({
      success: true,
      message: "Tables retrieved successfully",
      data: result.tables,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getTable = async (req, res, next) => {
  try {
    const table = await getTableById({
      tableId: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Table retrieved successfully",
      data: table,
    });
  } catch (error) {
    if (error.message === "TABLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    next(error);
  }
};

export const editTable = async (req, res, next) => {
  try {
    const table = await updateTableService({
      tableId: req.params.id,
      restaurantId: req.user.restaurantId,
      data: req.validatedBody,
    });

    return res.status(200).json({
      success: true,
      message: "Table updated successfully",
      data: table,
    });
  } catch (error) {
    if (error.message === "TABLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    if (error.message === "TABLE_NUMBER_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A table with this number already exists in this restaurant",
      });
    }

    next(error);
  }
};

export const removeTable = async (req, res, next) => {
  try {
    const table = await deleteTableService({
      tableId: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Table deactivated successfully",
      data: table,
    });
  } catch (error) {
    if (error.message === "TABLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    if (error.message === "TABLE_IS_OCCUPIED") {
      return res.status(409).json({
        success: false,
        message: "Cannot deactivate an occupied table",
      });
    }

    if (error.message === "TABLE_IS_RESERVED") {
      return res.status(409).json({
        success: false,
        message: "Cannot deactivate a reserved table",
      });
    }

    next(error);
  }
};

export const regenerateTableQr = async (req, res, next) => {
  try {
    const result = await rotateTableQrToken({
      tableId: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Table QR code regenerated successfully",
      data: {
        ...result.table,
        qrToken: result.qrToken,
      },
    });
  } catch (error) {
    if (error.message === "TABLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Active table not found",
      });
    }

    next(error);
  }
};

export const updateTableStatus = async (req, res, next) => {
  try {
    const table = await updateTableStatusService({
      tableId: req.params.id,
      restaurantId: req.user.restaurantId,
      status: req.validatedBody.status,
    });

    return res.status(200).json({
      success: true,
      message: "Table status updated successfully",
      data: table,
    });
  } catch (error) {
    if (error.message === "TABLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Active table not found",
      });
    }

    next(error);
  }
};