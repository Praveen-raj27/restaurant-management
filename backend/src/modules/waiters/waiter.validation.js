
import { z } from "zod";

const updateAvailabilitySchema = z.object({
  availability: z.enum([
    "AVAILABLE",
    "BUSY",
    "ON_BREAK",
    "OFFLINE",
  ]),
});

export const validateUpdateAvailability = (req, res, next) => {
  const result = updateAvailabilitySchema.safeParse(req.body);

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

const assignWaiterSchema = z.object({
  waiterMembershipId: z.string().uuid(
    "A valid waiter membership ID is required"
  ),
});

export const validateAssignWaiter = (req, res, next) => {
  const result = assignWaiterSchema.safeParse(req.body);

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