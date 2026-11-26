import {
  createMenuImport,
  getMenuImportById,
  saveMenuImportReview,
  approveMenuImportService,
  listMenuImportsService,
  retryMenuImportService
} from "./import.service.js";
import { processMenuImport } from "./import.processor.js";

export const uploadMenu = async (req, res, next) => {
  try {
    const menuImport = await createMenuImport({
      restaurantId: req.user.restaurantId,
      uploadedById: req.user.id,
      file: req.file,
    });

    // Start OCR processing in the background.
    processMenuImport({
      importId: menuImport.id,
      restaurantId: req.user.restaurantId,
    }).catch((error) => {
      console.error("Background menu processing error:", error);
    });

    return res.status(201).json({
      success: true,
      message: "Menu uploaded successfully",
      data: menuImport,
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuImport = async (req, res, next) => {
  try {
    const menuImport = await getMenuImportById({
      importId: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Menu import fetched successfully",
      data: menuImport,
    });
  } catch (error) {
    if (error.message === "MENU_IMPORT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Menu import not found",
      });
    }

    next(error);
  }
};

export const reviewMenuImport = async (req, res, next) => {
  try {
    const menuImport = await saveMenuImportReview({
      importId: req.params.id,
      restaurantId: req.user.restaurantId,
      pages: req.body.pages,
    });

    return res.status(200).json({
      success: true,
      message: "Menu review saved successfully",
      data: menuImport,
    });
  } catch (error) {
    if (error.message === "MENU_IMPORT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Menu import not found",
      });
    }

    if (error.message === "MENU_IMPORT_NOT_READY") {
      return res.status(409).json({
        success: false,
        message: "Menu import is not ready for review",
      });
    }

    next(error);
  }
};

export const approveMenuImport = async (req, res, next) => {
  try {
    const result = await approveMenuImportService({
      importId: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    return res.status(200).json({
      success: true,
      message: "Menu imported and approved successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "MENU_IMPORT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Menu import not found",
      });
    }

    if (
      error.message === "MENU_IMPORT_NOT_READY" ||
      error.message === "MENU_IMPORT_CHANGED"
    ) {
      return res.status(409).json({
        success: false,
        message: "Menu import is not ready for approval or has changed",
      });
    }

    if (error.message === "INVALID_MENU_CURRENCY") {
      return res.status(400).json({
        success: false,
        message: "All menu item prices must use INR (₹)",
      });
    }

    if (error.message === "INVALID_EXTRACTED_MENU_DATA") {
      return res.status(400).json({
        success: false,
        message: "Menu import contains invalid extracted data",
      });
    }

    next(error);
  }
};

export const listMenuImports = async (req, res, next) => {
  try {
    const result = await listMenuImportsService({
      restaurantId: req.user.restaurantId,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (
        error.message === "INVALID_PAGINATION" ||
        error.message === "INVALID_MENU_IMPORT_STATUS"
    ) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next(error);
}
};



export const retryMenuImport = async (req, res, next) => {
    try {
        const result = await retryMenuImportService({
            importId: req.params.id,
            restaurantId: req.user.restaurantId
        });

        // Start the existing OCR processor in the background.
        processMenuImport({
            importId: result.importId,
            restaurantId: req.user.restaurantId
        }).catch((error) => {
            console.error("Background menu retry error:", error);
        });

        return res.status(202).json({
            success: true,
            message: "Menu import retry started",
            data: {
                importId: result.importId,
                status: "PROCESSING"
            }
        });

    } catch (error) {
        if (error.message === "MENU_IMPORT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Menu import not found"
            });
        }

        if (
            error.message === "MENU_IMPORT_NOT_RETRYABLE" ||
            error.message === "MENU_IMPORT_CHANGED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Menu import cannot be retried in its current state"
            });
        }

        next(error);
    }
};
