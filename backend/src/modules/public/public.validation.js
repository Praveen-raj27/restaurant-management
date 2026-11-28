
import { z } from "zod";

const validateQrSchema = z.object({
  qrToken: z
    .string()
    .length(64, "Invalid QR token format")
    .regex(/^[a-f0-9]{64}$/, "Invalid QR token format"),
});

const placeOrderSchema = z.object({
  qrToken: z
    .string()
    .length(64, "Invalid QR token format")
    .regex(/^[a-f0-9]{64}$/, "Invalid QR token format"),

  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid("Invalid menu item ID"),

        variantId: z
          .string()
          .uuid("Invalid variant ID")
          .nullable()
          .optional(),

        quantity: z
          .number()
          .int("Quantity must be a whole number")
          .min(1, "Quantity must be at least 1")
          .max(99, "Maximum quantity per item is 99"),

        notes: z
          .string()
          .trim()
          .max(250, "Item notes cannot exceed 250 characters")
          .optional(),
      }),
    )
    .min(1, "At least one order item is required")
    .max(50, "Maximum 50 order items are allowed"),

  notes: z
    .string()
    .trim()
    .max(500, "Order notes cannot exceed 500 characters")
    .optional(),
});

const createValidationMiddleware = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

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

export const validateQrRequest =
  createValidationMiddleware(validateQrSchema);

export const validatePlaceOrderRequest =
  createValidationMiddleware(placeOrderSchema);
