import { z } from "zod";

const tableSessionSchema = z.object({
  tableId: z.string().uuid("Invalid table ID"),
});

export const validateOpenTableSession = (req, res, next) => {
  const result = tableSessionSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.flatten(),
    });
  }

  req.validatedBody = result.data;
  next();
};

export const validateCloseTableSession = validateOpenTableSession;