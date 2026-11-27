
import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js";

export const createEmployee = async ({
  name,
  email,
  phone,
  password,
  roleName,
  restaurantId,
  actorRole,
}) => {
  const role = await prisma.role.findUnique({
    where: {
      restaurantId_name: {
        restaurantId,
        name: roleName,
      },
    },
  });

  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }

  if (role.name === "OWNER") {
    throw new Error("OWNER_ROLE_NOT_ALLOWED");
  }

  // Only OWNER can assign the MANAGER role.
  if (role.name === "MANAGER" && actorRole !== "OWNER") {
    throw new Error("MANAGER_ROLE_ASSIGNMENT_FORBIDDEN");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
        },
      });

      const membership = await tx.restaurantMembership.create({
        data: {
          userId: user.id,
          restaurantId,
          roleId: role.id,
          status: "ACTIVE",
        },
        include: {
          role: true,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        membership: {
          id: membership.id,
          status: membership.status,
          role: membership.role.name,
        },
      };
    });

    return employee;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
};

export const getEmployees = async ({
  restaurantId,
  page,
  limit,
  search,
  role,
  status,
}) => {
  const skip = (page - 1) * limit;

  const where = {
    restaurantId,
    status: status || {
      not: "REMOVED",
    },
    role: {
      is: {
        name: role || {
          not: "OWNER",
        },
      },
    },
    ...(search && {
      user: {
        is: {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    }),
  };

  const [employees, total] = await prisma.$transaction([
    prisma.restaurantMembership.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.restaurantMembership.count({ where }),
  ]);

  return {
    employees,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateEmployee = async ({
  employeeId,
  restaurantId,
  actorId,
  actorRole,
  updates,
}) => {
  const membership = await prisma.restaurantMembership.findFirst({
    where: {
      id: employeeId,
      restaurantId,
      status: {
        not: "REMOVED",
      },
      role: {
        isNot: {
          name: "OWNER",
        },
      },
    },
    include: {
      user: true,
      role: true,
    },
  });

  if (!membership) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  // Prevent users from modifying their own membership.
  if (membership.userId === actorId) {
    throw new Error("SELF_MANAGEMENT_NOT_ALLOWED");
  }

  // MANAGER cannot manage another MANAGER.
  if (
    actorRole === "MANAGER" &&
    membership.role.name === "MANAGER"
  ) {
    throw new Error("FORBIDDEN_EMPLOYEE_MANAGEMENT");
  }

  // Only OWNER can promote an employee to MANAGER.
  if (
    updates.roleName === "MANAGER" &&
    actorRole !== "OWNER"
  ) {
    throw new Error("MANAGER_ROLE_ASSIGNMENT_FORBIDDEN");
  }

  const userUpdates = {};

  if (updates.name !== undefined) {
    userUpdates.name = updates.name;
  }

  if (updates.email !== undefined) {
    userUpdates.email = updates.email;
  }

  if (updates.phone !== undefined) {
    userUpdates.phone = updates.phone;
  }

  const membershipUpdates = {};

  if (updates.status !== undefined) {
    membershipUpdates.status = updates.status;
  }

  if (updates.roleName !== undefined) {
    const role = await prisma.role.findUnique({
      where: {
        restaurantId_name: {
          restaurantId,
          name: updates.roleName,
        },
      },
    });

    if (!role || role.name === "OWNER") {
      throw new Error("ROLE_NOT_FOUND");
    }

    membershipUpdates.roleId = role.id;
  }

  try {
    const updatedEmployee = await prisma.$transaction(async (tx) => {
      let updatedUser = membership.user;

      if (Object.keys(userUpdates).length > 0) {
        updatedUser = await tx.user.update({
          where: {
            id: membership.userId,
          },
          data: userUpdates,
        });
      }

      const updatedMembership =
        Object.keys(membershipUpdates).length > 0
          ? await tx.restaurantMembership.update({
              where: {
                id: membership.id,
              },
              data: membershipUpdates,
              include: {
                role: true,
              },
            })
          : membership;

      return {
        id: updatedMembership.id,
        status: updatedMembership.status,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
        },
        role: {
          id: updatedMembership.role.id,
          name: updatedMembership.role.name,
        },
      };
    });

    return updatedEmployee;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
};

export const removeEmployee = async ({
  employeeId,
  restaurantId,
  actorId,
  actorRole,
}) => {
  const membership = await prisma.restaurantMembership.findFirst({
    where: {
      id: employeeId,
      restaurantId,
      status: {
        not: "REMOVED",
      },
      role: {
        isNot: {
          name: "OWNER",
        },
      },
    },
    include: {
      role: true,
    },
  });

  if (!membership) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  // Prevent users from removing their own membership.
  if (membership.userId === actorId) {
    throw new Error("SELF_MANAGEMENT_NOT_ALLOWED");
  }

  // MANAGER cannot remove another MANAGER.
  if (
    actorRole === "MANAGER" &&
    membership.role.name === "MANAGER"
  ) {
    throw new Error("FORBIDDEN_EMPLOYEE_MANAGEMENT");
  }

  await prisma.restaurantMembership.update({
    where: {
      id: membership.id,
    },
    data: {
      status: "REMOVED",
    },
  });

  return {
    id: membership.id,
    status: "REMOVED",
  };
};
