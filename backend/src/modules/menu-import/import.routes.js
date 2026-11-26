
import { Router } from "express";

import {
    authenticate,
    authorize
} from "../../middlewares/auth.middleware.js";

import {
    uploadMenuFile,
    validateUploadedMenuFile,
    validateMenuReview
} from "./import.validation.js";

import {
    uploadMenu,
    getMenuImport,
    reviewMenuImport,
    approveMenuImport,
    listMenuImports,
    retryMenuImport
} from "./import.controller.js";

const router = Router();

// Upload menu file.
router.post(
    "/upload",
    authenticate,
    authorize("menu.manage"),
    uploadMenuFile,
    validateUploadedMenuFile,
    uploadMenu
);

// Fetch menu import.
router.get(
    "/:id",
    authenticate,
    authorize("menu.view"),
    getMenuImport
);

// Save owner corrections.
router.patch(
    "/:id/review",
    authenticate,
    authorize("menu.manage"),
    validateMenuReview,
    reviewMenuImport
);

router.post(
    "/:id/approve",
    authenticate,
    authorize("menu.manage"),
    approveMenuImport
);

router.get(
    "/",
    authenticate,
    authorize("menu.view"),
    listMenuImports
);

router.post(
    "/:id/retry",
    authenticate,
    authorize("menu.manage"),
    retryMenuImport
);
export default router;
