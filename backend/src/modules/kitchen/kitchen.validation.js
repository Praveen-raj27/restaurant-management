
import { z } from "zod";

const updateKitchenOrderStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY"]),
});

export const validateKitchenOrderStatus = (req, res, next) => {
  const result = updateKitchenOrderStatusSchema.safeParse(req.body);

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
