
import { Router } from "express";
import {
  validateQrCode,
  getPublicMenu,
} from "./public.controller.js";
import { validateQrRequest } from "./public.validation.js";

const router = Router();

// Public table QR validation
router.post(
  "/tables/validate-qr",
  validateQrRequest,
  validateQrCode
);

// Public menu retrieval using table QR token
router.post(
  "/tables/menu",
  validateQrRequest,
  getPublicMenu
);

export default router;
