
import {
  validateTableQrToken,
  getPublicMenuByQrToken,
} from "./public.service.js";

const handlePublicError = (error, res, next) => {
  if (error.message === "INVALID_QR_TOKEN") {
    return res.status(404).json({
      success: false,
      message: "Invalid or inactive QR code",
    });
  }

  return next(error);
};

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
    return handlePublicError(error, res, next);
  }
};

export const getPublicMenu = async (req, res, next) => {
  try {
    const { qrToken } = req.validatedBody;
    const result = await getPublicMenuByQrToken(qrToken);

    return res.status(200).json({
      success: true,
      message: "Menu retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handlePublicError(error, res, next);
  }
};
