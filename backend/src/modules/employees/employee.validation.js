
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),

  email: z.string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase()),

  phone: z.string()
    .trim()
    .min(7)
    .max(20)
    .optional(),

  password: z.string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password must not exceed 72 characters"),

  roleName: z.string()
    .trim()
    .min(2, "Role name is required")
    .max(50)
    .transform((value) => value.toUpperCase())
    .refine((value) => value !== "OWNER", {
      message: "OWNER role cannot be assigned through employee creation",
    }),
});

export const listEmployeesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  role: z.string().trim().toUpperCase().optional(),
});

export const validateCreateEmployee = (req, res, next) => {
  const result = createEmployeeSchema.safeParse(req.body);

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

const updateEmployeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100)
    .optional(),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .transform((value) => value.toLowerCase())
    .optional(),

  phone: z
    .string()
    .trim()
    .min(7, "Phone number must contain at least 7 characters")
    .max(20)
    .nullable()
    .optional(),

  roleName: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .transform((value) => value.toUpperCase())
    .refine((value) => value !== "OWNER", {
      message: "OWNER role cannot be assigned",
    })
    .optional(),

  status: z
    .enum(["ACTIVE", "SUSPENDED"])
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided",
  }
);


export const validateListEmployees = (req, res, next) => {
  const result = listEmployeesSchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.validatedQuery = result.data;
  next();
};



export const validateUpdateEmployee = (req, res, next) => {
  const result = updateEmployeeSchema.safeParse(req.body);

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