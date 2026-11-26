import { Router } from "express";
import { validateQrCode } from "./public.controller.js";
import { validateQrRequest } from "./public.validation.js";

const router = Router();

// Public table QR validation
router.post(
  "/tables/validate-qr",
  validateQrRequest,
  validateQrCode
);

export default router;