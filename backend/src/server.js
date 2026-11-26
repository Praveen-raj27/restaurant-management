import app from "./app.js";
import prisma from "./config/prisma.js";

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const shutdown = async () => {
    console.log("Shutting down server...");

    server.close(async () => {
        await prisma.$disconnect();
        console.log("Database disconnected");
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);