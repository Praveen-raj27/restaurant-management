import { Router } from "express";
import { register, login, refresh, logout } from "./auth.controller.js";
import { validateRegister, validateLogin } from "./auth.validation.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated user",
    data: req.user,
  });
});
router.get(
  "/test/employees",
  authenticate,
  authorize("employees.manage"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "You have permission to manage employees",
      role: req.user.role,
    });
  }
);
export default router;