
import { Router } from "express";
import { authenticate, authorize } from "../../../middlewares/auth.middleware.js";
import { addMenuItem, getMenuItems, getMenuItem, editMenuItem, removeMenuItem } from "./item.controller.js";
import { validateCreateItem, validateListItems, validateItemId, validateUpdateItem } from "./item.validation.js";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("menu.manage"),
    validateCreateItem,
    addMenuItem
);

router.get(
    "/",
    authenticate,
    authorize("menu.view"),
    validateListItems,
    getMenuItems
);

router.get(
    "/:id",
    authenticate,
    authorize("menu.view"),
    validateItemId,
    getMenuItem
);

router.patch(
    "/:id",
    authenticate,
    authorize("menu.manage"),
    validateItemId,
    validateUpdateItem,
    editMenuItem
);

router.delete(
    "/:id",
    authenticate,
    authorize("menu.manage"),
    validateItemId,
    removeMenuItem
);

export default router;
