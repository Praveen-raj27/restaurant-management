
import prisma from "../../../config/prisma.js";

export const createMenuItem = async ({ restaurantId, data }) => {
    return prisma.$transaction(async (tx) => {
        // Verify that the category belongs to this restaurant
        // and is currently active.
        const category = await tx.menuCategory.findFirst({
            where: {
                id: data.categoryId,
                restaurantId,
                isActive: true
            },
            select: {
                id: true
            }
        });

        if (!category) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        const { variants, ...itemData } = data;

        const menuItem = await tx.menuItem.create({
            data: {
                restaurantId,
                ...itemData,
                ...(variants && {
                    price: null,
                    variants: {
                        create: variants.map((variant) => ({
                            name: variant.name,
                            price: variant.price,
                            displayOrder: variant.displayOrder
                        }))
                    }
                })
            },
            select: {
                id: true,
                name: true,
                description: true,
                foodType: true,
                price: true,
                preparationTime: true,
                isAvailable: true,
                isActive: true,
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                variants: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        displayOrder: true
                    },
                    orderBy: {
                        displayOrder: "asc"
                    }
                },
                createdAt: true
            }
        });

        return menuItem;
    });
};


export const listMenuItems = async ({ restaurantId, filters }) => {
    const {
        page,
        limit,
        search,
        categoryId,
        foodType,
        isAvailable,
        isActive
    } = filters;

    const where = {
        restaurantId,

        ...(search && {
            name: {
                contains: search,
                mode: "insensitive"
            }
        }),

        ...(categoryId && { categoryId }),

        ...(foodType && { foodType }),

        ...(isAvailable !== undefined && { isAvailable }),

        ...(isActive !== undefined && { isActive })
    };

    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
        prisma.menuItem.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { createdAt: "desc" }
            ],
            select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                foodType: true,
                price: true,
                preparationTime: true,
                isAvailable: true,
                isActive: true,

                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },

                variants: {
                    where: {
                        isActive: true
                    },
                    orderBy: {
                        displayOrder: "asc"
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        displayOrder: true,
                        isAvailable: true
                    }
                },

                createdAt: true,
                updatedAt: true
            }
        }),

        prisma.menuItem.count({ where })
    ]);

    return {
        items,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};


export const getMenuItemById = async ({ itemId, restaurantId }) => {
    const menuItem = await prisma.menuItem.findFirst({
        where: {
            id: itemId,
            restaurantId
        },
        select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            foodType: true,
            price: true,
            preparationTime: true,
            isAvailable: true,
            isActive: true,

            category: {
                select: {
                    id: true,
                    name: true
                }
            },

            variants: {
                orderBy: {
                    displayOrder: "asc"
                },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    displayOrder: true,
                    isAvailable: true,
                    isActive: true
                }
            },

            createdAt: true,
            updatedAt: true
        }
    });

    if (!menuItem) {
        throw new Error("MENU_ITEM_NOT_FOUND");
    }

    return menuItem;
};



export const updateMenuItem = async ({ itemId, restaurantId, data }) => {
    return prisma.$transaction(async (tx) => {
        const existingItem = await tx.menuItem.findFirst({
            where: {
                id: itemId,
                restaurantId
            },
            include: {
                variants: true
            }
        });

        if (!existingItem) {
            throw new Error("MENU_ITEM_NOT_FOUND");
        }

        // Validate category ownership if category is changing.
        if (data.categoryId) {
            const category = await tx.menuCategory.findFirst({
                where: {
                    id: data.categoryId,
                    restaurantId,
                    isActive: true
                },
                select: {
                    id: true
                }
            });

            if (!category) {
                throw new Error("CATEGORY_NOT_FOUND");
            }
        }

        const { variants, ...itemData } = data;

        const activeVariants = existingItem.variants.filter(
            (variant) => variant.isActive
        );

        const hasActiveVariants = activeVariants.length > 0;

        // Validate price and variant combinations.
        if (variants !== undefined && itemData.price !== undefined) {
            throw new Error("VARIANTS_AND_BASE_PRICE_NOT_ALLOWED");
        }

        if (
            variants === undefined &&
            hasActiveVariants &&
            itemData.price !== undefined
        ) {
            throw new Error("VARIANT_ITEM_PRICE_NOT_ALLOWED");
        }

        if (
            variants === undefined &&
            !hasActiveVariants &&
            itemData.price === null
        ) {
            throw new Error("ITEM_PRICE_REQUIRED");
        }

        // Update the menu item.
        const menuItemData = { ...itemData };

        // When converting a simple item into a variant-based item,
        // remove its base price.
        if (variants !== undefined) {
            menuItemData.price = null;
        }

        await tx.menuItem.update({
            where: {
                id: itemId
            },
            data: menuItemData
        });

        // Reconcile variants only when the frontend sends them.
        if (variants !== undefined) {
            const existingVariantIds = new Set(
                existingItem.variants.map((variant) => variant.id)
            );

            const requestedVariantIds = new Set();
            const requestedNames = new Set();
            const retainedVariantIds = new Set();

            for (const variant of variants) {
                const normalizedName = variant.name.trim().toLowerCase();

                // Prevent duplicate variant names in the same request.
                if (requestedNames.has(normalizedName)) {
                    throw new Error("DUPLICATE_VARIANT_NAME");
                }

                requestedNames.add(normalizedName);

                if (variant.id) {
                    // Existing variant must belong to this menu item.
                    if (!existingVariantIds.has(variant.id)) {
                        throw new Error("INVALID_VARIANT_ID");
                    }

                    if (requestedVariantIds.has(variant.id)) {
                        throw new Error("DUPLICATE_VARIANT_ID");
                    }

                    requestedVariantIds.add(variant.id);

                    await tx.menuItemVariant.update({
                        where: {
                            id: variant.id
                        },
                        data: {
                            name: variant.name,
                            price: variant.price,
                            displayOrder: variant.displayOrder,
                            isActive: true
                        }
                    });

                    retainedVariantIds.add(variant.id);
                } else {
                    // Reuse an existing variant with the same name,
                    // including an inactive variant.
                    const matchingVariant = existingItem.variants.find(
                        (existingVariant) =>
                            existingVariant.name.toLowerCase() ===
                            normalizedName
                    );

                    if (matchingVariant) {
                        await tx.menuItemVariant.update({
                            where: {
                                id: matchingVariant.id
                            },
                            data: {
                                name: variant.name,
                                price: variant.price,
                                displayOrder: variant.displayOrder,
                                isActive: true
                            }
                        });

                        retainedVariantIds.add(matchingVariant.id);
                    } else {
                        const newVariant = await tx.menuItemVariant.create({
                            data: {
                                menuItemId: itemId,
                                name: variant.name,
                                price: variant.price,
                                displayOrder: variant.displayOrder
                            },
                            select: {
                                id: true
                            }
                        });

                        retainedVariantIds.add(newVariant.id);
                    }
                }
            }

            // Deactivate previously active variants omitted from the request.
            const variantsToDeactivate = existingItem.variants
                .filter(
                    (variant) =>
                        variant.isActive &&
                        !retainedVariantIds.has(variant.id)
                )
                .map((variant) => variant.id);

            if (variantsToDeactivate.length > 0) {
                await tx.menuItemVariant.updateMany({
                    where: {
                        id: {
                            in: variantsToDeactivate
                        },
                        menuItemId: itemId
                    },
                    data: {
                        isActive: false
                    }
                });
            }
        }

        // Return the updated item with its variants.
        return tx.menuItem.findFirst({
            where: {
                id: itemId,
                restaurantId
            },
            select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                foodType: true,
                price: true,
                preparationTime: true,
                isAvailable: true,
                isActive: true,
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                variants: {
                    orderBy: {
                        displayOrder: "asc"
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        displayOrder: true,
                        isAvailable: true,
                        isActive: true
                    }
                },
                updatedAt: true
            }
        });
    });
};




export const deleteMenuItem = async ({ itemId, restaurantId }) => {
    const menuItem = await prisma.menuItem.findFirst({
        where: {
            id: itemId,
            restaurantId
        },
        select: {
            id: true,
            name: true,
            isActive: true
        }
    });

    if (!menuItem) {
        throw new Error("MENU_ITEM_NOT_FOUND");
    }

    // Active items must first be deactivated.
    if (menuItem.isActive) {
        throw new Error("MENU_ITEM_MUST_BE_INACTIVE");
    }

    // Permanently delete inactive items.
    // Associated variants are deleted through Prisma's onDelete: Cascade.
    return prisma.menuItem.delete({
        where: {
            id: menuItem.id
        },
        select: {
            id: true,
            name: true
        }
    });
};
