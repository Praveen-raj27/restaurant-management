
import {
  getKitchenOrders,
  updateKitchenOrderStatus,
} from "./kitchen.service.js";

export const listKitchenOrders = async (req, res, next) => {
  try {
    const orders = await getKitchenOrders({
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Kitchen orders retrieved successfully",
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const changeKitchenOrderStatus = async (req, res, next) => {
  try {
    const order = await updateKitchenOrderStatus({
      restaurantId: req.user.restaurantId,
      orderId: req.params.orderId,
      status: req.validatedBody.status,
    });

    return res.status(200).json({
      success: true,
      message: "Kitchen order status updated successfully",
      data: order,
    });
  } catch (error) {
    const statusCodes = {
      ORDER_NOT_FOUND: 404,
      INVALID_ORDER_STATUS_TRANSITION: 409,
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
