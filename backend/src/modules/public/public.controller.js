import { validateTableQrToken } from "./public.service.js";

export const validateQrCode = async (req, res, next) => {
  try {
    const { qrToken } = req.validatedBody;

    const result = await validateTableQrToken(qrToken);

    return res.status(200).json({
      success: true,
      message: "QR code validated successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "INVALID_QR_TOKEN") {
      return res.status(404).json({
        success: false,
        message: "Invalid or inactive QR code",
      });
    }

    next(error);
  }
};