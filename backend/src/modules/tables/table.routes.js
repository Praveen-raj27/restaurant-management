import { Router } from "express";
import {
  createTable,
  listTables,
  getTable,
  editTable,
  removeTable,
  regenerateTableQr,
  updateTableStatus,
} from "./table.controller.js";
import {
  validateCreateTable,
  validateListTables,
  validateUpdateTable,
  validateUpdateTableStatus,
} from "./table.validation.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Create a restaurant table
router.post(
  "/",
  authenticate,
  authorize("tables.manage"),
  validateCreateTable,
  createTable,
);

router.get(
  "/",
  authenticate,
  authorize("tables.view"),
  validateListTables,
  listTables,
);

router.get("/:id", authenticate, authorize("tables.view"), getTable);

// Update table operational status
router.patch(
  "/:id/status",
  authenticate,
  authorize("tables.status.update"),
  validateUpdateTableStatus,
  updateTableStatus,
);

// Update a table
router.patch(
  "/:id",
  authenticate,
  authorize("tables.manage"),
  validateUpdateTable,
  editTable,
);

// Soft delete (deactivate) a table
router.delete("/:id", authenticate, authorize("tables.manage"), removeTable);

// Regenerate table QR token
router.post(
  "/:id/qr/regenerate",
  authenticate,
  authorize("tables.manage"),
  regenerateTableQr,
);

export default router;
