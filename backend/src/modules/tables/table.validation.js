import { z } from "zod";

const createTableSchema = z.object({
  tableNumber: z.number()
    .int("Table number must be an integer")
    .positive("Table number must be greater than zero"),

  name: z.string()
    .trim()
    .min(1, "Table name cannot be empty")
    .max(50, "Table name cannot exceed 50 characters")
    .optional(),

  capacity: z.number()
    .int("Capacity must be an integer")
    .min(1, "Capacity must be at least 1")
    .max(50, "Capacity cannot exceed 50")
    .default(2),
});

const listTablesSchema = z.object({
  page: z.coerce.number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(10),

  search: z.string()
    .trim()
    .max(100)
    .optional(),

  status: z.enum([
    "AVAILABLE",
    "OCCUPIED",
    "RESERVED",
  ]).optional(),

  isActive: z.enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const updateTableSchema = z.object({
  tableNumber: z.number()
    .int()
    .positive("Table number must be greater than zero")
    .optional(),

  name: z.string()
    .trim()
    .min(1)
    .max(50)
    .nullable()
    .optional(),

  capacity: z.number()
    .int()
    .min(1)
    .max(50)
    .optional(),

  status: z.enum([
    "AVAILABLE",
    "OCCUPIED",
    "RESERVED",
  ]).optional(),

  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});


export const validateCreateTable = (req, res, next) => {
  const result = createTableSchema.safeParse(req.body);

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


export const validateListTables = (req, res, next) => {
  const result = listTablesSchema.safeParse(req.query);

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

  req.validatedQuery = result.data;
  next();
};

export const validateUpdateTable = (req, res, next) => {
  const result = updateTableSchema.safeParse(req.body);

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