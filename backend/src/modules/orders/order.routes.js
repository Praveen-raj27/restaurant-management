
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

import {
  addOrder,
  serveOrder,
  getOrderCount,
  listRecentOrders
} from "./order.controller.js";

import { validateCreateOrder } from "./order.validation.js";

const router = Router();

// Create a staff order.
router.post(
  "/",
  authenticate,
  authorize("orders.create"),
  validateCreateOrder,
  addOrder,
);

// Mark a READY order as SERVED.
router.patch(
  "/:orderId/serve",
  authenticate,
  authorize("orders.update_status"),
  serveOrder,
);

// Retrieve total restaurant orders.
router.get(
  "/count",
  authenticate,
  authorize("orders.view"),
  getOrderCount,
);

// Retrieve the five most recent restaurant orders.
router.get(
  "/recent",
  authenticate,
  authorize("orders.view"),
  listRecentOrders,
);

export default router;
