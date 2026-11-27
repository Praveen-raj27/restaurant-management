
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

import {
  addOrder,
  serveOrder,
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

export default router;
