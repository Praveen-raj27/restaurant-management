import { z } from "zod";

const validateQrSchema = z.object({
  qrToken: z.string()
    .length(64, "Invalid QR token format")
    .regex(/^[a-f0-9]{64}$/, "Invalid QR token format"),
});

export const validateQrRequest = (req, res, next) => {
  const result = validateQrSchema.safeParse(req.body);

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