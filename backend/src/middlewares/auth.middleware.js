
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export const authenticate = async (req, res, next) => {
  try {
    // 1. Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // 2. Extract access token
    const accessToken = authHeader.split(" ")[1];

    // 3. Verify JWT
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET
    );

    // 4. Validate user and restaurant membership
    const membership = await prisma.restaurantMembership.findFirst({
      where: {
        id: decoded.membershipId,
        userId: decoded.sub,
        restaurantId: decoded.restaurantId,
        status: "ACTIVE",
        user: {
          isActive: true,
        },
        restaurant: {
          status: "ACTIVE",
        },
      },
      include: {
        user: true,
        restaurant: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return res.status(401).json({
        success: false,
        message: "Your account or restaurant membership is inactive",
      });
    }

    // 5. Attach authenticated context
    req.user = {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      restaurantId: membership.restaurantId,
      membershipId: membership.id,
      restaurantName: membership.restaurant.name,
      role: membership.role.name,
      permissions: membership.role.permissions.map(
        (item) => item.permission.key
      ),
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    next(error);
  }
};



export const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    // Authentication must run before authorization
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // OWNER has full restaurant access
    if (req.user.role === "OWNER") {
      return next();
    }

    // Check whether the user has all required permissions
    const hasPermission = requiredPermissions.every(
      (permission) => req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};
