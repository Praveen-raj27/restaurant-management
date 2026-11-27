
import {
  createOrder,
  markOrderAsServed,
} from "./order.service.js";

export const addOrder = async (req, res, next) => {
  try {
    const order = await createOrder({
      restaurantId: req.user.restaurantId,
      tableId: req.validatedBody.tableId,
      createdById: req.user.id,
      source: "STAFF",
      data: req.validatedBody,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    const errors = {
      TABLE_NOT_FOUND: [404, "Table not found"],
      TABLE_RESERVED: [409, "Table is reserved"],
      ACTIVE_TABLE_SESSION_REQUIRED: [
        409,
        "Open a table session before creating an order",
      ],
      MENU_ITEM_NOT_AVAILABLE: [
        400,
        "One or more menu items are unavailable",
      ],
      VARIANT_REQUIRED: [
        400,
        "Please select a menu item variant",
      ],
      INVALID_OR_UNAVAILABLE_VARIANT: [
        400,
        "Selected variant is invalid or unavailable",
      ],
      VARIANT_NOT_ALLOWED: [
        400,
        "This menu item does not support variants",
      ],
      MENU_ITEM_PRICE_NOT_CONFIGURED: [
        400,
        "Menu item price is not configured",
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
  }
};

export const serveOrder = async (req, res, next) => {
  try {
    const order = await markOrderAsServed({
      restaurantId: req.user.restaurantId,
      orderId: req.params.orderId,
    });

    return res.status(200).json({
      success: true,
      message: "Order marked as served successfully",
      data: order,
    });
  } catch (error) {
    const errors = {
      ORDER_NOT_FOUND: [404, "Order not found"],
      ORDER_NOT_READY: [
        409,
        "Only READY orders can be marked as served",
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
  }
};
