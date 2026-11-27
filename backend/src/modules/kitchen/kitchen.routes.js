
import { Router } from "express";

import { authenticate , authorize} from "../../middlewares/auth.middleware.js";

import {
  listKitchenOrders,
  changeKitchenOrderStatus,
} from "./kitchen.controller.js";

import {
  validateKitchenOrderStatus,
} from "./kitchen.validation.js";

const router = Router();

// Retrieve active kitchen orders.
router.get(
  "/orders",
  authenticate,
  authorize("kitchen.view"),
  listKitchenOrders,
);

// Update kitchen order status.
router.patch(
  "/orders/:orderId/status",
  authenticate,
  authorize("kitchen.manage"),
  validateKitchenOrderStatus,
  changeKitchenOrderStatus,
);

export default router;
