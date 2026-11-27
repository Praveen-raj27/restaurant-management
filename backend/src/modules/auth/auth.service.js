
import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js";
import crypto from "node:crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../../utils/token.js";

const roles = [
  {
    name: "OWNER",
    description: "Full restaurant access",
    permissions: null,
  },
  {
    name: "MANAGER",
    description: "Restaurant operations management",
    permissions: [
      "dashboard.view",
      "employees.view",
      "employees.manage",
      "tables.view",
      "tables.manage",
      "tables.status.update",
      "menu.view",
      "menu.manage",
      "orders.view",
      "orders.create",
      "orders.manage",
      "orders.update_status",
      "kitchen.view",
      "kitchen.manage",
      "payments.view",
      "payments.process",
      "reports.view",
    ],
  },
  {
    name: "KITCHEN_STAFF",
    description: "Kitchen order management",
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.update_status",
      "kitchen.view",
      "kitchen.manage",
    ],
  },
  {
    name: "WAITER",
    description: "Table and customer order management",
    permissions: [
      "dashboard.view",
      "tables.view",
      "tables.status.update",
      "orders.view",
      "orders.create",
      "orders.update_status",
    ],
  },
  {
    name: "CASHIER",
    description: "Billing and payment management",
    permissions: [
      "dashboard.view",
      "orders.view",
      "payments.view",
      "payments.process",
      "reports.view",
    ],
  },
];

export const registerOwner = async ({
  name,
  email,
  password,
  restaurantName,
}) => {
  // 1. Validate refresh-token expiration configuration
  const refreshTokenDays = Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7
  );

  if (
    !Number.isInteger(refreshTokenDays) ||
    refreshTokenDays <= 0
  ) {
    throw new Error(
      "Invalid refresh token expiration configuration"
    );
  }

  // 2. Hash password before storing it
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    // 3. Create user
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // 4. Generate a URL-friendly restaurant slug
    const baseSlug = restaurantName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const restaurant = await tx.restaurant.create({
      data: {
        name: restaurantName,
        slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
      },
    });

    // 5. Fetch global permissions
    const allPermissions = await tx.permission.findMany();

    if (allPermissions.length === 0) {
      throw new Error(
        "Permission catalogue is empty. Run database seed first."
      );
    }

    const permissionMap = new Map(
      allPermissions.map((permission) => [
        permission.key,
        permission.id,
      ])
    );

    // 6. Create restaurant-specific roles and mappings
    const createdRoles = {};

    for (const roleConfig of roles) {
      const role = await tx.role.create({
        data: {
          restaurantId: restaurant.id,
          name: roleConfig.name,
          description: roleConfig.description,
        },
      });

      const permissionKeys =
        roleConfig.permissions ??
        allPermissions.map((permission) => permission.key);

      const rolePermissionData = permissionKeys.map((key) => {
        const permissionId = permissionMap.get(key);

        if (!permissionId) {
          throw new Error(`Permission not found: ${key}`);
        }

        return {
          roleId: role.id,
          permissionId,
        };
      });

      await tx.rolePermission.createMany({
        data: rolePermissionData,
      });

      createdRoles[roleConfig.name] = role.id;
    }

    // 7. Create owner membership
    const membership = await tx.restaurantMembership.create({
  data: {
    userId: user.id,
    restaurantId: restaurant.id,
    roleId: createdRoles.OWNER,
  },
  include: {
    role: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});

    // 8. Generate access token
    const accessToken = generateAccessToken({
      userId: user.id,
      restaurantId: restaurant.id,
      membershipId: membership.id,
    });

    // 9. Generate refresh token
    const refreshToken = generateRefreshToken();

    // 10. Hash refresh token before storing it
    const tokenHash = hashRefreshToken(refreshToken);

    // 11. Store refresh token in database
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId: crypto.randomUUID(),
        expiresAt: new Date(
          Date.now() +
            refreshTokenDays * 24 * 60 * 60 * 1000
        ),
      },
    });

    // 12. Return registration result
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      membership: {
  id: membership.id,
  status: membership.status,
  role: {
    id: membership.role.id,
    name: membership.role.name,
  },
},
      accessToken,
      refreshToken,
    };
  });
};




export const loginUser = async ({ email, password }) => {
  // 1. Validate refresh-token expiration configuration
  const refreshTokenDays = Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7
  );

  if (
    !Number.isInteger(refreshTokenDays) ||
    refreshTokenDays <= 0
  ) {
    throw new Error(
      "Invalid refresh token expiration configuration"
    );
  }

  // 2. Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: {
          status: "ACTIVE",
          restaurant: {
            status: "ACTIVE",
          },
        },
        include: {
          restaurant: true,
          role: true,
        },
      },
    },
  });

  // 3. Validate credentials
  if (!user || !user.isActive) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // 4. Check active restaurant memberships
  if (user.memberships.length === 0) {
    throw new Error("NO_ACTIVE_MEMBERSHIP");
  }

  // 5. Select membership
  // For now, automatically select the first active membership.
  // We'll support restaurant selection when users belong to multiple restaurants.
  const membership = user.memberships[0];

  // 6. Generate access token
  const accessToken = generateAccessToken({
    userId: user.id,
    restaurantId: membership.restaurantId,
    membershipId: membership.id,
  });

  // 7. Generate refresh token
  const refreshToken = generateRefreshToken();

  const tokenHash = hashRefreshToken(refreshToken);

  // 8. Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId: crypto.randomUUID(),
      expiresAt: new Date(
        Date.now() +
          refreshTokenDays * 24 * 60 * 60 * 1000
      ),
    },
  });

  // 9. Return authentication result
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    restaurant: {
      id: membership.restaurant.id,
      name: membership.restaurant.name,
      slug: membership.restaurant.slug,
    },
    membership: {
  id: membership.id,
  status: membership.status,
  role: {
    id: membership.role.id,
    name: membership.role.name,
  },
},
    accessToken,
    refreshToken,
  };
};


export const logoutUser = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};




export const refreshUserSession = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const refreshTokenDays = Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7
  );

  if (
    !Number.isInteger(refreshTokenDays) ||
    refreshTokenDays <= 0
  ) {
    throw new Error("Invalid refresh token expiration configuration");
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Find the stored refresh token
      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken) {
        return { error: "INVALID_REFRESH_TOKEN" };
      }

      // 2. Detect reuse of an already-revoked token
      if (storedToken.revokedAt) {
        await tx.refreshToken.updateMany({
          where: {
            familyId: storedToken.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        return { error: "REFRESH_TOKEN_REUSE" };
      }

      // 3. Reject expired tokens
      if (storedToken.expiresAt <= now) {
        await tx.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });

        return { error: "INVALID_REFRESH_TOKEN" };
      }

      // 4. Atomically revoke the old token
      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
        },
      });

      if (revoked.count !== 1) {
        return { error: "INVALID_REFRESH_TOKEN" };
      }

      // 5. Validate the user and active memberships
      const user = await tx.user.findUnique({
        where: { id: storedToken.userId },
        include: {
          memberships: {
            where: {
              status: "ACTIVE",
              restaurant: {
                status: "ACTIVE",
              },
            },
            include: {
              restaurant: true,
              role: true,
            },
          },
        },
      });

      if (!user || !user.isActive || user.memberships.length === 0) {
        return { error: "INVALID_REFRESH_TOKEN" };
      }

      const membership = user.memberships[0];

      // 6. Generate new tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        restaurantId: membership.restaurantId,
        membershipId: membership.id,
      });

      const newRefreshToken = generateRefreshToken();

      // 7. Store the new refresh token in the same family
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken(newRefreshToken),
          familyId: storedToken.familyId,
          expiresAt: new Date(
            Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000
          ),
        },
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        restaurant: {
          id: membership.restaurant.id,
          name: membership.restaurant.name,
          slug: membership.restaurant.slug,
        },
        membership: {
  id: membership.id,
  status: membership.status,
  role: {
    id: membership.role.id,
    name: membership.role.name,
  },
},
        accessToken,
        refreshToken: newRefreshToken,
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );

  // Throw outside the transaction so security updates are committed.
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
};

