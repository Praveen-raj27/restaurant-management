
import { createCategory, listCategories, getCategoryById, updateCategory, deleteCategory } from "./category.service.js";

export const addCategory = async (req, res, next) => {
    try {
        const category = await createCategory({
            restaurantId: req.user.restaurantId,
            data: req.validatedBody
        });

        return res.status(201).json({
            success: true,
            message: "Menu category created successfully",
            data: category
        });
    } catch (error) {
        if (error.message === "CATEGORY_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "A category with this name already exists"
            });
        }

        next(error);
    }
};


export const getCategories = async (req, res, next) => {
    try {
        const result = await listCategories({
            restaurantId: req.user.restaurantId,
            ...req.validatedQuery
        });

        return res.status(200).json({
            success: true,
            message: "Menu categories fetched successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
};


export const getCategory = async (req, res, next) => {
    try {
        const category = await getCategoryById({
            categoryId: req.params.id,
            restaurantId: req.user.restaurantId
        });

        return res.status(200).json({
            success: true,
            message: "Menu category fetched successfully",
            data: category
        });
    } catch (error) {
        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu category not found"
            });
        }

        next(error);
    }
};


export const editCategory = async (req, res, next) => {
    try {
        const category = await updateCategory({
            categoryId: req.params.id,
            restaurantId: req.user.restaurantId,
            data: req.validatedBody
        });

        return res.status(200).json({
            success: true,
            message: "Menu category updated successfully",
            data: category
        });
    } catch (error) {
        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu category not found"
            });
        }

        if (error.message === "CATEGORY_ALREADY_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "A category with this name already exists"
            });
        }

        next(error);
    }
};


export const removeCategory = async (req, res, next) => {
    try {
        const category = await deleteCategory({
            categoryId: req.params.id,
            restaurantId: req.user.restaurantId
        });

        return res.status(200).json({
            success: true,
            message: "Menu category deactivated successfully",
            data: category
        });
    } catch (error) {
        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu category not found or already inactive"
            });
        }

        next(error);
    }
};
