
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware.js";

import {
  listWaiters,
  changeWaiterAvailability,
  assignWaiter,
  listWaiterOrders,
  claimOrderForWaiter,
  pickupOrderForWaiter,
  serveOrderForWaiter
} from "./waiter.controller.js";

import {
  validateUpdateAvailability,
  validateAssignWaiter
} from "./waiter.validation.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("waiters.view"),
  listWaiters
);

// Waiter updates their own availability.
router.patch(
  "/availability",
  authenticate,
  authorize("waiters.availability.update"),
  validateUpdateAvailability,
  changeWaiterAvailability
);

// Manager updates a specific waiter's availability.
router.patch(
  "/:membershipId/availability",
  authenticate,
  authorize("waiters.availability.update"),
  validateUpdateAvailability,
  changeWaiterAvailability
);

router.patch(
  "/sessions/:sessionId/assign",
  authenticate,
  authorize("waiters.manage"),
  validateAssignWaiter,
  assignWaiter
);

router.get(
  "/orders",
  authenticate,
  authorize("waiters.orders.view"),
  listWaiterOrders
);

router.patch(
  "/orders/:orderId/claim",
  authenticate,
  authorize("waiters.orders.claim"),
  claimOrderForWaiter
);

router.patch(
  "/orders/:orderId/pickup",
  authenticate,
  authorize("waiters.orders.pickup"),
  pickupOrderForWaiter
);

router.patch(
  "/orders/:orderId/serve",
  authenticate,
  authorize("waiters.orders.serve"),
  serveOrderForWaiter
);

export default router;
