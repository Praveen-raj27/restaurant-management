import {
  validateTableQrToken,
  getPublicMenuByQrToken,
  placeGuestOrder,
} from "./public.service.js";

const handlePublicError = (error, res, next) => {
  const errors = {
    INVALID_QR_TOKEN: {
      status: 404,
      message: "Invalid or inactive QR code",
    },
    TABLE_NOT_OCCUPIED: {
      status: 409,
      message: "Table is not currently occupied",
    },
    OPEN_SESSION_NOT_FOUND: {
      status: 409,
      message: "No open table session found. Please ask staff for assistance.",
    },
    INVALID_OR_UNAVAILABLE_MENU_ITEM: {
      status: 400,
      message: "One or more menu items are unavailable",
    },
    VARIANT_REQUIRED: {
      status: 400,
      message: "Please select a variant for every applicable item",
    },
    INVALID_OR_UNAVAILABLE_VARIANT: {
      status: 400,
      message: "Selected variant is unavailable",
    },
    INVALID_VARIANT_FOR_MENU_ITEM: {
      status: 400,
      message: "Invalid variant selection",
    },
    MENU_ITEM_PRICE_NOT_CONFIGURED: {
      status: 409,
      message: "Price is not configured for one or more menu items",
    },
    INVALID_IDEMPOTENCY_KEY: {
      status: 400,
      message: "A valid idempotency key is required.",
    },
  };

  const knownError = errors[error.message];

  if (knownError) {
    return res.status(knownError.status).json({
      success: false,
      message: knownError.message,
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

export const createGuestOrder = async (req, res, next) => {
  try {
    const result = await placeGuestOrder({
      ...req.validatedBody,
      idempotencyKey: req.get("Idempotency-Key"),
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: result,
    });
  } catch (error) {
    return handlePublicError(error, res, next);
  }
};
