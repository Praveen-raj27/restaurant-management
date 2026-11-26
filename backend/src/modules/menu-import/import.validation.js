
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { validate as isValidUUID } from "uuid";

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png"
];

// Configure Multer
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1
    },

    fileFilter: (req, file, callback) => {
        // Preliminary check only.
        // The actual file signature is verified below.
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(new Error("UNSUPPORTED_FILE_TYPE"));
        }

        callback(null, true);
    }
});

// Accept only files whose actual binary signature is supported.
export const validateUploadedMenuFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a menu file"
            });
        }

        const detectedType = await fileTypeFromBuffer(req.file.buffer);

        if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file content. Upload a valid PDF, JPG or PNG"
            });
        }

        req.file.detectedMimeType = detectedType.mime;

        next();
    } catch (error) {
        next(error);
    }
};

export const uploadMenuFile = upload.single("menu");

export const validateMenuReview = (req, res, next) => {
    try {
        const { pages } = req.body;

        if (!Array.isArray(pages) || pages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Menu pages are required"
            });
        }

        for (const page of pages) {
            if (
                !Number.isInteger(page.page) ||
                page.page < 1 ||
                !Array.isArray(page.categories)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid menu page structure"
                });
            }

            for (const category of page.categories) {
                if (
                    !isValidUUID(category.id) ||
                    typeof category.name !== "string" ||
                    !category.name.trim() ||
                    category.name.length > 100 ||
                    !Array.isArray(category.items)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid menu category"
                    });
                }

                for (const item of category.items) {
                    if (
                        !isValidUUID(item.id) ||
                        typeof item.name !== "string" ||
                        !item.name.trim() ||
                        item.name.length > 150 ||
                        typeof item.description !== "string" ||
                        item.description.length > 1000 ||
                        typeof item.price !== "number" ||
                        !Number.isFinite(item.price) ||
                        item.price <= 0 ||
                        !["₹", "$", "€", "£"].includes(item.currency) ||
                        !["VEG", "NON_VEG", "VEGAN"].includes(item.foodType)
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid menu item"
                        });
                    }
                }
            }
        }

        next();

    } catch (error) {
        next(error);
    }
};