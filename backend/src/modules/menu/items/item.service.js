
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

        const hasVariants = existingItem.variants.length > 0;

        // A variant-based item cannot have a base price.
        if (hasVariants && data.price !== undefined) {
            throw new Error("VARIANT_ITEM_PRICE_NOT_ALLOWED");
        }

        // A simple item cannot have a null price.
        if (!hasVariants && data.price === null) {
            throw new Error("ITEM_PRICE_REQUIRED");
        }

        const updatedItem = await tx.menuItem.update({
            where: {
                id: itemId
            },
            data,
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

        return updatedItem;
    });
};


export const deleteMenuItem = async ({ itemId, restaurantId }) => {
    const menuItem = await prisma.menuItem.findFirst({
        where: {
            id: itemId,
            restaurantId,
            isActive: true
        },
        select: {
            id: true,
            name: true
        }
    });

    if (!menuItem) {
        throw new Error("MENU_ITEM_NOT_FOUND");
    }

    return prisma.menuItem.update({
        where: {
            id: itemId
        },
        data: {
            isActive: false
        },
        select: {
            id: true,
            name: true,
            isActive: true,
            updatedAt: true
        }
    });
};
