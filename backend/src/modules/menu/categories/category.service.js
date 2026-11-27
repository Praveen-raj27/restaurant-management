
import prisma from "../../../config/prisma.js";


export const createCategory = async ({ restaurantId, data }) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const existingCategory = await tx.menuCategory.findUnique({
                where: {
                    restaurantId_name: {
                        restaurantId,
                        name: data.name
                    }
                }
            });

            if (existingCategory?.isActive) {
                throw new Error("CATEGORY_ALREADY_EXISTS");
            }

            if (existingCategory) {
                return tx.menuCategory.update({
                    where: {
                        id: existingCategory.id
                    },
                    data: {
                        ...data,
                        isActive: true
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        displayOrder: true,
                        isActive: true,
                        createdAt: true
                    }
                });
            }

            return tx.menuCategory.create({
                data: {
                    restaurantId,
                    ...data
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    displayOrder: true,
                    isActive: true,
                    createdAt: true
                }
            });
        });
    } catch (error) {
        if (error.code === "P2002") {
            throw new Error("CATEGORY_ALREADY_EXISTS");
        }

        throw error;
    }
};


export const listCategories = async ({ restaurantId, search, isActive }) => {
    const where = {
        restaurantId,
        ...(typeof isActive === "boolean" && { isActive }),
        ...(search && {
            name: {
                contains: search,
                mode: "insensitive"
            }
        })
    };

    const [categories, total] = await prisma.$transaction([
        prisma.menuCategory.findMany({
            where,
            orderBy: [
                { displayOrder: "asc" },
                { createdAt: "desc" }
            ],
            select: {
                id: true,
                name: true,
                description: true,
                displayOrder: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        }),
        prisma.menuCategory.count({ where })
    ]);

    return {
        categories,
        pagination: {
            total,
            count: categories.length
        }
    };
};


export const getCategoryById = async ({ categoryId, restaurantId }) => {
    const category = await prisma.menuCategory.findFirst({
        where: {
            id: categoryId,
            restaurantId
        },
        select: {
            id: true,
            name: true,
            description: true,
            displayOrder: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
    }

    return category;
};


export const updateCategory = async ({
    categoryId,
    restaurantId,
    data
}) => {
    try {
        const existingCategory = await prisma.menuCategory.findFirst({
            where: {
                id: categoryId,
                restaurantId
            }
        });

        if (!existingCategory) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        return await prisma.menuCategory.update({
            where: {
                id: categoryId
            },
            data,
            select: {
                id: true,
                name: true,
                description: true,
                displayOrder: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
    } catch (error) {
        if (error.code === "P2002") {
            throw new Error("CATEGORY_ALREADY_EXISTS");
        }

        throw error;
    }
};



export const deleteCategory = async ({ categoryId, restaurantId }) => {
  return prisma.$transaction(async (tx) => {
    const category = await tx.menuCategory.findFirst({
      where: {
        id: categoryId,
        restaurantId,
        isActive: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    const menuItemCount = await tx.menuItem.count({
      where: {
        categoryId,
      },
    });

    if (menuItemCount > 0) {
      throw new Error("CATEGORY_HAS_MENU_ITEMS");
    }

    return tx.menuCategory.delete({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  });
};

