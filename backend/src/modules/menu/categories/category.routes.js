
import { Router } from "express";
import { authenticate, authorize } from "../../../middlewares/auth.middleware.js";
import { addCategory, getCategories, getCategory, editCategory, removeCategory } from "./category.controller.js";
import { validateCreateCategory, validateListCategories , validateUpdateCategory} from "./category.validation.js";
import { validateCategoryId } from "./category.validation.js";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("menu.manage"),
    validateCreateCategory,
    addCategory
);

router.get(
    "/",
    authenticate,
    authorize("menu.view"),
    validateListCategories,
    getCategories
);

router.get(
    "/:id",
    authenticate,
    authorize("menu.view"),
    validateCategoryId,
    getCategory
);

router.patch(
    "/:id",
    authenticate,
    authorize("menu.manage"),
    validateCategoryId,
    validateUpdateCategory,
    editCategory
);

router.delete(
    "/:id",
    authenticate,
    authorize("menu.manage"),
    validateCategoryId,
    removeCategory
);

export default router;
