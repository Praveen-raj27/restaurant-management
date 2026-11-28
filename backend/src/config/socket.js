
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.1.24:5173",
];

let io;

const authenticateSocket = async (socket, next) => {
  try {
    const accessToken = socket.handshake.auth?.accessToken;

    if (!accessToken) {
      return next(new Error("Access token is required"));
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET
    );

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
      return next(new Error("Invalid restaurant membership"));
    }

    const permissions = membership.role.permissions.map(
      (item) => item.permission.key
    );

    const isOwner = membership.role.name === "OWNER";
    const canViewKitchen =
      isOwner || permissions.includes("kitchen.view");

    if (!canViewKitchen) {
      return next(
        new Error("You do not have permission to access kitchen orders")
      );
    }

    socket.data.user = {
      userId: decoded.sub,
      membershipId: membership.id,
      restaurantId: membership.restaurantId,
      role: membership.role.name,
      permissions,
    };

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    next(new Error("Invalid or expired access token"));
  }
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(
          new Error(`Socket CORS blocked for origin: ${origin}`)
        );
      },
      credentials: true,
    },
  });

  // Authenticate before allowing a connection.
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const { restaurantId, userId } = socket.data.user;

    // Each restaurant has its own isolated kitchen room.
    const room = `restaurant:${restaurantId}`;

    socket.join(room);

    console.log(
      `Kitchen socket connected: ${socket.id}, User: ${userId}, Restaurant: ${restaurantId}`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}, Reason: ${reason}`
      );
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};
