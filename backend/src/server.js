import { createServer } from "http";

import app from "./app.js";
import prisma from "./config/prisma.js";
import { initializeSocket } from "./config/socket.js";

const PORT = process.env.PORT || 5001;

const server = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO initialized");
});

const shutdown = async () => {
  console.log("Shutting down server...");

  io.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database disconnected");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);