
import { z } from "zod";

const moneySchema = z.union([
    z.string(),
    z.number()
]).transform(value => String(value))
.refine(
    value => /^\d{1,6}(\.\d{1,2})?$/.test(value) && Number(value) > 0,
    "Price must be positive and have at most 2 decimal places"
);

const variantSchema = z.object({
    name: z.string().trim().min(1).max(50),
    price: moneySchema,
    displayOrder: z.coerce.number().int().min(0).default(0)
});

export const createItemSchema = z.object({
    categoryId: z.string().uuid(),

    name: z.string().trim().min(2).max(100),

    description: z.string().trim().max(500).optional().nullable(),

    imageUrl: z.string().url().optional().nullable(),

    foodType: z.enum(["VEG", "NON_VEG", "VEGAN"]).default("VEG"),

    price: moneySchema.optional().nullable(),

    preparationTime: z.coerce.number().int().positive().max(1440).optional().nullable(),

    variants: z.array(variantSchema).min(1).optional()
}).refine(
    data => {
        const hasBasePrice = data.price !== null && data.price !== undefined;
        const hasVariants = data.variants?.length > 0;

        return hasBasePrice !== hasVariants;
    },
    {
        message: "Provide either a base price or one or more variants, not both",
        path: ["price"]
    }
);

export const validateCreateItem = (req, res, next) => {
    const result = createItemSchema.safeParse(req.body);

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



const listItemsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),

    search: z.string().trim().optional(),

    categoryId: z.string().uuid().optional(),

    foodType: z.enum(["VEG", "NON_VEG", "VEGAN"]).optional(),

    isAvailable: z.enum(["true", "false"])
        .transform(value => value === "true")
        .optional(),

    isActive: z.enum(["true", "false"])
        .transform(value => value === "true")
        .optional()
});

export const validateListItems = (req, res, next) => {
    const result = listItemsSchema.safeParse(req.query);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.issues
        });
    }

    req.validatedQuery = result.data;
    next();
};

export const validateItemId = (req, res, next) => {
    const result = z.string().uuid().safeParse(req.params.id);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid menu item ID"
        });
    }

    next();
};


const updateItemSchema = z.object({
    categoryId: z.string().uuid().optional(),

    name: z.string().trim().min(2).max(100).optional(),

    description: z.string().trim().max(500).nullable().optional(),

    imageUrl: z.string().url().nullable().optional(),

    foodType: z.enum(["VEG", "NON_VEG", "VEGAN"]).optional(),

    price: moneySchema.nullable().optional(),

    preparationTime: z.coerce.number()
        .int()
        .positive()
        .max(1440)
        .nullable()
        .optional(),

    isAvailable: z.boolean().optional(),

    isActive: z.boolean().optional()
}).refine(
    data => Object.keys(data).length > 0,
    {
        message: "At least one field is required"
    }
);

export const validateUpdateItem = (req, res, next) => {
    const result = updateItemSchema.safeParse(req.body);

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
