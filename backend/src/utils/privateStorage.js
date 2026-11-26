
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_ROOT = path.resolve(
    process.cwd(),
    "storage",
    "menu-imports"
);

const MIME_EXTENSIONS = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png"
};

export const saveMenuFile = async ({
    buffer,
    mimeType,
    restaurantId
}) => {
    const extension = MIME_EXTENSIONS[mimeType];

    if (!extension) {
        throw new Error("UNSUPPORTED_FILE_TYPE");
    }

    const fileName = `${crypto.randomUUID()}${extension}`;

    const relativeDirectory = restaurantId;
    const storageKey = path.posix.join(
        relativeDirectory,
        fileName
    );

    const absoluteDirectory = path.join(
        STORAGE_ROOT,
        restaurantId
    );

    const absolutePath = path.join(
        absoluteDirectory,
        fileName
    );

    await fs.mkdir(absoluteDirectory, {
        recursive: true
    });

    await fs.writeFile(absolutePath, buffer, {
        flag: "wx",
        mode: 0o600
    });

    return {
        storageKey,
        mimeType,
        fileSize: buffer.length
    };
};


export const resolveMenuFilePath = ({ storageKey, restaurantId }) => {
    if (!storageKey || !restaurantId) {
        throw new Error("INVALID_STORAGE_REFERENCE");
    }

    // Storage keys must be relative and belong to this restaurant.
    const normalizedKey = path.posix.normalize(storageKey);

    if (
        path.posix.isAbsolute(storageKey) ||
        normalizedKey !== storageKey ||
        normalizedKey.startsWith("../") ||
        normalizedKey.includes("\\") ||
        normalizedKey.split("/")[0] !== restaurantId
    ) {
        throw new Error("INVALID_STORAGE_KEY");
    }

    const absolutePath = path.resolve(
        STORAGE_ROOT,
        ...normalizedKey.split("/")
    );

    const allowedRoot = `${STORAGE_ROOT}${path.sep}`;

    if (!absolutePath.startsWith(allowedRoot)) {
        throw new Error("INVALID_STORAGE_PATH");
    }

    return absolutePath;
};


export const menuFileExists = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile();
    } catch (error) {
        if (error.code === "ENOENT") {
            return false;
        }

        throw error;
    }
};
