
import { createMenuItem, listMenuItems,getMenuItemById, updateMenuItem, deleteMenuItem } from "./item.service.js";

export const addMenuItem = async (req, res, next) => {
    try {
        const menuItem = await createMenuItem({
            restaurantId: req.user.restaurantId,
            data: req.validatedBody
        });

        return res.status(201).json({
            success: true,
            message: "Menu item created successfully",
            data: menuItem
        });
    } catch (error) {
        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Category not found or inactive"
            });
        }

        next(error);
    }
};



export const getMenuItems = async (req, res, next) => {
    try {
        const result = await listMenuItems({
            restaurantId: req.user.restaurantId,
            filters: req.validatedQuery
        });

        return res.status(200).json({
            success: true,
            message: "Menu items fetched successfully",
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};


export const getMenuItem = async (req, res, next) => {
    try {
        const menuItem = await getMenuItemById({
            itemId: req.params.id,
            restaurantId: req.user.restaurantId
        });

        return res.status(200).json({
            success: true,
            message: "Menu item fetched successfully",
            data: menuItem
        });
    } catch (error) {
        if (error.message === "MENU_ITEM_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        next(error);
    }
};



export const editMenuItem = async (req, res, next) => {
    try {
        const menuItem = await updateMenuItem({
            itemId: req.params.id,
            restaurantId: req.user.restaurantId,
            data: req.validatedBody
        });

        return res.status(200).json({
            success: true,
            message: "Menu item updated successfully",
            data: menuItem
        });
    } catch (error) {
        if (error.message === "MENU_ITEM_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Category not found or inactive"
            });
        }

        if (
            error.message === "VARIANT_ITEM_PRICE_NOT_ALLOWED" ||
            error.message === "VARIANTS_AND_BASE_PRICE_NOT_ALLOWED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Variant-based items cannot have a base price"
            });
        }

        if (error.message === "ITEM_PRICE_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "A simple menu item must have a price"
            });
        }

        if (error.message === "DUPLICATE_VARIANT_NAME") {
            return res.status(409).json({
                success: false,
                message: "Variant names must be unique within a menu item"
            });
        }

        if (
            error.message === "INVALID_VARIANT_ID" ||
            error.message === "DUPLICATE_VARIANT_ID"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid or duplicate variant reference"
            });
        }

        next(error);
    }
};




export const removeMenuItem = async (req, res, next) => {
    try {
        const menuItem = await deleteMenuItem({
            itemId: req.params.id,
            restaurantId: req.user.restaurantId
        });

        return res.status(200).json({
            success: true,
            message: "Menu item permanently deleted successfully",
            data: menuItem
        });
    } catch (error) {
        if (error.message === "MENU_ITEM_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        if (error.message === "MENU_ITEM_MUST_BE_INACTIVE") {
            return res.status(409).json({
                success: false,
                message: "Please deactivate the menu item before permanently deleting it"
            });
        }

        next(error);
    }
};

