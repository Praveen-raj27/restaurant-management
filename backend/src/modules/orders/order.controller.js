
import { createOrder, markOrderAsServed } from "./order.service.js";

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
    const statusCodes = {
      TABLE_NOT_FOUND: 404,
      TABLE_RESERVED: 409,
      MENU_ITEM_NOT_AVAILABLE: 400,
      VARIANT_REQUIRED: 400,
      INVALID_OR_UNAVAILABLE_VARIANT: 400,
      VARIANT_NOT_ALLOWED: 400,
      MENU_ITEM_PRICE_NOT_CONFIGURED: 400,
    };

    const statusCode = statusCodes[error.message];

    if (statusCode) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
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
    const statusCodes = {
      ORDER_NOT_FOUND: 404,
      ORDER_NOT_READY: 409,
    };

    const statusCode = statusCodes[error.message];

    if (statusCode) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};
