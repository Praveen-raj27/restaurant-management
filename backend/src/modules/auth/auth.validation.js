
import { z } from "zod";

export const registerSchema = z.object({
    name: z.string()
        .trim()
        .min(2, "Name must contain at least 2 characters")
        .max(100),

    email: z.string()
        .trim()
        .email("Enter a valid email address")
        .max(255)
        .transform((value) => value.toLowerCase()),

    password: z.string()
        .min(8, "Password must contain at least 8 characters")
        .max(72, "Password must not exceed 72 characters"),

    restaurantName: z.string()
        .trim()
        .min(2, "Restaurant name must contain at least 2 characters")
        .max(150)
});

export const validateRegister = (req, res, next) => {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data;
    next();
};

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),

  password: z.string()
    .min(1, "Password is required"),
});

export const validateLogin = (req, res, next) => {
  const result = loginSchema.safeParse(req.body);

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

  req.body = result.data;
  next();
};
