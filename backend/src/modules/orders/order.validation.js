
import { z } from "zod";

const orderItemSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),

  // Required only for variant-based menu items.
  variantId: z.string().uuid("Invalid variant ID").optional(),

  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(20, "Maximum quantity per item is 20"),

  notes: z
    .string()
    .trim()
    .max(250, "Item notes cannot exceed 250 characters")
    .optional()
    .nullable(),
});

const createOrderSchema = z.object({
  tableId: z.string().uuid("Invalid table ID"),

  items: z
    .array(orderItemSchema)
    .min(1, "An order must contain at least one item")
    .max(50, "An order cannot contain more than 50 items"),

  notes: z
    .string()
    .trim()
    .max(500, "Order notes cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export const validateCreateOrder = (req, res, next) => {
  const result = createOrderSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.validatedBody = result.data;
  next();
};
