
import { Router } from "express";
import {
  validateQrCode,
  getPublicMenu,
  createGuestOrder
} from "./public.controller.js";
import { validateQrRequest, validatePlaceOrderRequest } from "./public.validation.js";

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

// Guest order placement
router.post(
  "/orders",
  validatePlaceOrderRequest,
  createGuestOrder
);

export default router;
