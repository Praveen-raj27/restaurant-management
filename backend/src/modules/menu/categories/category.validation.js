
import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(250).optional().nullable(),
    displayOrder: z.coerce.number().int().min(0).default(0)
});


export const updateCategorySchema = z.object({
    name: z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(250).optional().nullable(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field is required" }
);

const listCategoriesSchema = z.object({
    search: z.string().trim().optional(),
    isActive: z.enum(["true", "false"])
        .transform(value => value === "true")
        .optional()
});

export const validateCreateCategory = (req, res, next) => {
    const result = createCategorySchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.issues
        });
    }

    req.validatedBody = result.data;
    next();
};

export const validateUpdateCategory = (req, res, next) => {
    const result = updateCategorySchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.issues
        });
    }

    req.validatedBody = result.data;
    next();
};

export const validateListCategories = (req, res, next) => {
    const result = listCategoriesSchema.safeParse(req.query);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid query parameters",
            errors: result.error.issues
        });
    }

    req.validatedQuery = result.data;
    next();
};


const categoryIdSchema = z.object({
    id: z.string().uuid()
});

export const validateCategoryId = (req, res, next) => {
    const result = categoryIdSchema.safeParse(req.params);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid category ID"
        });
    }

    next();
};
