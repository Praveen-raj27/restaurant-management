
import prisma from "../../config/prisma.js";
import { saveMenuFile } from "../../utils/privateStorage.js";

export const createMenuImport = async ({
    restaurantId,
    uploadedById,
    file
}) => {
    const storedFile = await saveMenuFile({
        buffer: file.buffer,
        mimeType: file.detectedMimeType,
        restaurantId
    });

    try {
        const menuImport = await prisma.menuImport.create({
            data: {
                restaurantId,
                uploadedById,
                originalFileName: file.originalname,
                storageKey: storedFile.storageKey,
                mimeType: storedFile.mimeType,
                fileSize: storedFile.fileSize,
                status: "UPLOADED"
            },
            select: {
                id: true,
                originalFileName: true,
                mimeType: true,
                fileSize: true,
                status: true,
                createdAt: true
            }
        });

        return menuImport;
    } catch (error) {
        // Avoid leaving an orphaned file if the DB insert fails.
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

        const filePath = path.resolve(
            process.cwd(),
            "storage",
            "menu-imports",
            storedFile.storageKey
        );

        await fs.unlink(filePath).catch(() => {});

        throw error;
    }
};

export const getMenuImportById = async ({
    importId,
    restaurantId
}) => {
    const menuImport = await prisma.menuImport.findFirst({
        where: {
            id: importId,
            restaurantId
        },
        select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            fileSize: true,
            status: true,
            extractedData: true,
            errorMessage: true,
            approvedAt: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!menuImport) {
        throw new Error("MENU_IMPORT_NOT_FOUND");
    }

    return menuImport;
};


export const saveMenuImportReview = async ({
    importId,
    restaurantId,
    pages
}) => {
    const menuImport = await prisma.menuImport.findFirst({
        where: {
            id: importId,
            restaurantId
        }
    });

    if (!menuImport) {
        throw new Error("MENU_IMPORT_NOT_FOUND");
    }

    if (menuImport.status !== "REVIEW_REQUIRED") {
        throw new Error("MENU_IMPORT_NOT_READY");
    }

    const originalData = menuImport.extractedData;

    if (!originalData || !Array.isArray(originalData.pages)) {
        throw new Error("INVALID_EXTRACTED_MENU_DATA");
    }

    // Prevent duplicate page IDs/numbers in the submitted review.
    const submittedPageNumbers = pages.map((page) => page.page);

    if (
        new Set(submittedPageNumbers).size !==
        submittedPageNumbers.length
    ) {
        throw new Error("DUPLICATE_MENU_PAGE");
    }

    const reviewedPages = pages.map((submittedPage) => {
        const originalPage = originalData.pages.find(
            (page) => page.page === submittedPage.page
        );

        if (!originalPage) {
            throw new Error("INVALID_MENU_PAGE");
        }

        const submittedCategoryIds = submittedPage.categories.map(
            (category) => category.id
        );

        if (
            new Set(submittedCategoryIds).size !==
            submittedCategoryIds.length
        ) {
            throw new Error("DUPLICATE_MENU_CATEGORY");
        }

        const reviewedCategories = submittedPage.categories.map(
            (submittedCategory) => {
                const originalCategory = originalPage.categories.find(
                    (category) => category.id === submittedCategory.id
                );

                if (!originalCategory) {
                    throw new Error("INVALID_MENU_CATEGORY");
                }

                const submittedItemIds = submittedCategory.items.map(
                    (item) => item.id
                );

                if (
                    new Set(submittedItemIds).size !==
                    submittedItemIds.length
                ) {
                    throw new Error("DUPLICATE_MENU_ITEM");
                }

                const reviewedItems = submittedCategory.items.map(
                    (submittedItem) => {
                        const originalItem = originalCategory.items.find(
                            (item) => item.id === submittedItem.id
                        );

                        if (!originalItem) {
                            throw new Error("INVALID_MENU_ITEM");
                        }

                        // Preserve system-generated OCR metadata.
                        return {
                            ...originalItem,

                            name: submittedItem.name.trim(),
                            description: submittedItem.description.trim(),
                            price: submittedItem.price,
                            currency: submittedItem.currency,
                            foodType: submittedItem.foodType
                        };
                    }
                );

                return {
                    ...originalCategory,
                    name: submittedCategory.name.trim(),
                    items: reviewedItems
                };
            }
        );

        return {
            ...originalPage,
            categories: reviewedCategories
        };
    });

    const extractedData = {
        ...originalData,
        pages: reviewedPages,
        reviewRequired: true
    };

    // Optimistic concurrency protection: don't overwrite a newer review.
    const updated = await prisma.menuImport.updateMany({
        where: {
            id: importId,
            restaurantId,
            status: "REVIEW_REQUIRED",
            updatedAt: menuImport.updatedAt
        },
        data: {
            extractedData
        }
    });

    if (updated.count === 0) {
        throw new Error("MENU_IMPORT_CHANGED");
    }

    return prisma.menuImport.findFirst({
        where: {
            id: importId,
            restaurantId
        },
        select: {
            id: true,
            status: true,
            extractedData: true,
            updatedAt: true
        }
    });
};


export const approveMenuImportService = async ({
    importId,
    restaurantId
}) => {
    const menuImport = await prisma.menuImport.findFirst({
        where: {
            id: importId,
            restaurantId
        }
    });
    

    if (!menuImport) {
        throw new Error("MENU_IMPORT_NOT_FOUND");
    }

    if (menuImport.status !== "REVIEW_REQUIRED") {
        throw new Error("MENU_IMPORT_NOT_READY");
    }

    const extractedData = menuImport.extractedData;

    if (
        !extractedData ||
        !Array.isArray(extractedData.pages) ||
        extractedData.pages.length === 0
    ) {
        throw new Error("INVALID_EXTRACTED_MENU_DATA");
    }

    // Validate the complete menu before starting the transaction.
    let totalItems = 0;

    for (const page of extractedData.pages) {
        if (!Array.isArray(page.categories)) {
            throw new Error("INVALID_EXTRACTED_MENU_DATA");
        }

        for (const category of page.categories) {
            if (
                typeof category.name !== "string" ||
                !category.name.trim() ||
                !Array.isArray(category.items)
            ) {
                throw new Error("INVALID_EXTRACTED_MENU_DATA");
            }

            for (const item of category.items) {
                if (
                    typeof item.name !== "string" ||
                    !item.name.trim() ||
                    typeof item.price !== "number" ||
                    !Number.isFinite(item.price) ||
                    item.price <= 0 ||
                    !["VEG", "NON_VEG", "VEGAN"].includes(item.foodType)
                ) {
                    throw new Error("INVALID_EXTRACTED_MENU_DATA");
                }

                if (item.currency !== "₹") {
                    throw new Error("INVALID_MENU_CURRENCY");
                }

                totalItems++;
            }
        }
    }

    if (totalItems === 0) {
        throw new Error("INVALID_EXTRACTED_MENU_DATA");
    }

    return prisma.$transaction(async (tx) => {
        let createdCategories = 0;
        let createdItems = 0;
        let skippedItems = 0;

        for (const page of extractedData.pages) {
            for (const category of page.categories) {
                // Reuse an existing category for this restaurant.
                // Otherwise, create it.
                const existingCategory = await tx.menuCategory.findUnique({
                    where: {
                        restaurantId_name: {
                            restaurantId,
                            name: category.name.trim()
                        }
                    }
                });

                let menuCategory = existingCategory;

                if (!menuCategory) {
                    menuCategory = await tx.menuCategory.create({
                        data: {
                            restaurantId,
                            name: category.name.trim(),
                            displayOrder: createdCategories
                        }
                    });

                    createdCategories++;
                }

               
for (const item of category.items) {
    const existingItem = await tx.menuItem.findFirst({
        where: {
            restaurantId,
            categoryId: menuCategory.id,
            name: {
                equals: item.name.trim(),
                mode: "insensitive"
            }
        }
    });

    if (existingItem) {
        skippedItems++;
        continue;
    }

    await tx.menuItem.create({
        data: {
            restaurantId,
            categoryId: menuCategory.id,
            name: item.name.trim(),
            description: item.description?.trim() || null,
            price: item.price.toFixed(2),
            foodType: item.foodType
        }
    });

    createdItems++;
}

            }
        }

        // Change import status only if it has not changed
        // since we initially fetched it.
        const updated = await tx.menuImport.updateMany({
            where: {
                id: importId,
                restaurantId,
                status: "REVIEW_REQUIRED",
                updatedAt: menuImport.updatedAt
            },
            data: {
                status: "APPROVED",
                approvedAt: new Date()
            }
        });

        if (updated.count === 0) {
            throw new Error("MENU_IMPORT_CHANGED");
        }

        return {
            importId,
            status: "APPROVED",
            createdCategories,
            createdItems,
            skippedItems,
            approvedAt: new Date()
        };
    });
};


export const listMenuImportsService = async ({
    restaurantId,
    page = 1,
    limit = 10,
    status
}) => {
    // Validate pagination
    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
    ) {
        throw new Error("INVALID_PAGINATION");
    }

    // Validate status filter
    const allowedStatuses = [
        "UPLOADED",
        "PROCESSING",
        "REVIEW_REQUIRED",
        "APPROVED",
        "FAILED"
    ];

    if (status && !allowedStatuses.includes(status)) {
        throw new Error("INVALID_MENU_IMPORT_STATUS");
    }

    const where = {
        restaurantId,
        ...(status ? { status } : {})
    };

    const skip = (page - 1) * limit;

    const [total, imports] = await Promise.all([
        prisma.menuImport.count({
            where
        }),

        prisma.menuImport.findMany({
            where,
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take: limit,
            select: {
                id: true,
                originalFileName: true,
                mimeType: true,
                fileSize: true,
                status: true,
                errorMessage: true,
                approvedAt: true,
                createdAt: true,
                updatedAt: true,
                extractedData: true
            }
        })
    ]);

    const data = imports.map((menuImport) => {
        const pages = menuImport.extractedData?.pages ?? [];

        const itemCount = Array.isArray(pages)
            ? pages.reduce((totalItems, page) => {
                const categories = Array.isArray(page.categories)
                    ? page.categories
                    : [];

                return totalItems + categories.reduce(
                    (count, category) => {
                        return count + (
                            Array.isArray(category.items)
                                ? category.items.length
                                : 0
                        );
                    },
                    0
                );
            }, 0)
            : 0;

        const {
            extractedData,
            ...importDetails
        } = menuImport;

        return {
            ...importDetails,
            itemCount
        };
    });

    return {
        imports: data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};


export const retryMenuImportService = async ({
    importId,
    restaurantId
}) => {
    const result = await prisma.menuImport.updateMany({
        where: {
            id: importId,
            restaurantId,
            status: "FAILED"
        },
        data: {
            status: "UPLOADED",
            errorMessage: null,
            extractedData: null
        }
    });

    if (result.count === 0) {
        const menuImport = await prisma.menuImport.findFirst({
            where: {
                id: importId,
                restaurantId
            },
            select: {
                id: true
            }
        });

        if (!menuImport) {
            throw new Error("MENU_IMPORT_NOT_FOUND");
        }

        throw new Error("MENU_IMPORT_NOT_RETRYABLE");
    }

    return {
        importId,
        status: "UPLOADED"
    };
};
