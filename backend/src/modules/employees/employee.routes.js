
import { Router } from "express";
import { addEmployee, listEmployees, editEmployee, deleteEmployee } from "./employee.controller.js";
import { validateCreateEmployee, validateListEmployees, validateUpdateEmployee } from "./employee.validation.js";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("employees.manage"),
  validateCreateEmployee,
  addEmployee
);

router.get(
  "/",
  authenticate,
  authorize("employees.view"),
  validateListEmployees,
  listEmployees
);

router.patch(
  "/:id",
  authenticate,
  authorize("employees.manage"),
  validateUpdateEmployee,
  editEmployee
);

router.delete(
  "/:id",
  authenticate,
  authorize("employees.manage"),
  deleteEmployee
);

export default router;
