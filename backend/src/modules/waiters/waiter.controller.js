import {
  getWaiters,
  updateWaiterAvailability as updateAvailability,
  assignWaiterToSession as assignSessionWaiter,
  getWaiterOrders as fetchWaiterOrders,
  claimWaiterOrder as claimOrder,
  pickupWaiterOrder as pickupOrder,
  serveWaiterOrder as serveOrder,
} from "./waiter.service.js";

export const listWaiters = async (req, res, next) => {
  try {
    const waiters = await getWaiters({
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Waiters retrieved successfully",
      data: waiters,
    });
  } catch (error) {
    next(error);
  }
};

export const changeWaiterAvailability = async (req, res, next) => {
  try {
    const membershipId = req.params.membershipId || req.user.membershipId;

    const waiter = await updateAvailability({
      restaurantId: req.user.restaurantId,
      membershipId,
      availability: req.validatedBody.availability,
      actorRole: req.user.role,
      actorMembershipId: req.user.membershipId,
    });

    return res.status(200).json({
      success: true,
      message: "Waiter availability updated successfully",
      data: waiter,
    });
  } catch (error) {
    if (error.message === "WAITER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Active waiter not found",
      });
    }

    if (error.message === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "You can only update your own availability",
      });
    }

    next(error);
  }
};

export const assignWaiter = async (req, res, next) => {
  try {
    const result = await assignSessionWaiter({
      restaurantId: req.user.restaurantId,
      sessionId: req.params.sessionId,
      waiterMembershipId: req.validatedBody.waiterMembershipId,
    });

    return res.status(200).json({
      success: true,
      message: "Waiter assigned to table session successfully",
      data: result,
    });
  } catch (error) {
    const errors = {
      RESTAURANT_NOT_FOUND: [404, "Restaurant not found"],
      ASSIGNED_MODE_REQUIRED: [409, "Waiter assignment requires ASSIGNED mode"],
      OPEN_SESSION_NOT_FOUND: [404, "Open table session not found"],
      WAITER_NOT_AVAILABLE: [
        409,
        "Waiter is inactive, unavailable, or not a waiter",
      ],
    };

    const result = errors[error.message];

    if (result) {
      return res.status(result[0]).json({
        success: false,
        message: result[1],
      });
    }

    next(error);
  }
};

export const listWaiterOrders = async (req, res, next) => {
  try {
    const orders = await fetchWaiterOrders({
      restaurantId: req.user.restaurantId,
      membershipId: req.user.membershipId,
    });

    return res.status(200).json({
      success: true,
      message: "Waiter orders retrieved successfully",
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const claimOrderForWaiter = async (req, res, next) => {
  try {
    const order = await claimOrder({
      restaurantId: req.user.restaurantId,
      orderId: req.params.orderId,
      membershipId: req.user.membershipId,
    });

    return res.status(200).json({
      success: true,
      message: "Order claimed successfully",
      data: order,
    });
  } catch (error) {
    const errors = {
      RESTAURANT_NOT_FOUND: [404, "Restaurant not found"],
      OPEN_MODE_REQUIRED: [
        409,
        "Order claiming is only available in OPEN assignment mode",
      ],
      WAITER_NOT_AVAILABLE: [
        409,
        "Your waiter account is not available to claim orders",
      ],
      ORDER_NOT_READY: [409, "Order is not ready for pickup"],
      ORDER_ALREADY_ASSIGNED: [409, "This order has already been claimed"],
    };

    const result = errors[error.message];

    if (result) {
      return res.status(result[0]).json({
        success: false,
        message: result[1],
      });
    }

    next(error);
  }
};

export const pickupOrderForWaiter = async (req, res, next) => {
  try {
    const order = await pickupOrder({
      restaurantId: req.user.restaurantId,
      orderId: req.params.orderId,
      membershipId: req.user.membershipId,
    });

    return res.status(200).json({
      success: true,
      message: "Order picked up successfully",
      data: order,
    });
  } catch (error) {
    const errors = {
      ORDER_NOT_ASSIGNED_OR_READY: [
        409,
        "Order is not ready or is not assigned to you",
      ],
      ORDER_PICKUP_CONFLICT: [
        409,
        "Order pickup could not be completed because its status changed",
      ],
    };

    const result = errors[error.message];

    if (result) {
      return res.status(result[0]).json({
        success: false,
        message: result[1],
      });
    }

    next(error);
  }
};


export const serveOrderForWaiter = async (req, res, next) => {
  try {
    const order = await serveOrder({
      restaurantId: req.user.restaurantId,
      orderId: req.params.orderId,
      membershipId: req.user.membershipId,
    });

    return res.status(200).json({
      success: true,
      message: "Order served successfully",
      data: order,
    });
  } catch (error) {
    const errors = {
      ORDER_NOT_PICKED_UP_BY_YOU: [
        409,
        "You must pick up this order before serving it",
      ],
      ORDER_SERVE_CONFLICT: [
        409,
        "Order serving could not be completed because its status changed",
      ],
    };

    const result = errors[error.message];

    if (result) {
      return res.status(result[0]).json({
        success: false,
        message: result[1],
      });
    }

    next(error);
  }
};
