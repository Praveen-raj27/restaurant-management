import { Router } from "express";

import {
  openSession,
  closeSession,
} from "./table-session.controller.js";

import {
  validateOpenTableSession,
  validateCloseTableSession,
} from "./table-session.validation.js";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/open",
  authenticate,
  authorize("tables.manage"),
  validateOpenTableSession,
  openSession,
);

router.post(
  "/close",
  authenticate,
  authorize("tables.manage"),
  validateCloseTableSession,
  closeSession,
);

export default router;