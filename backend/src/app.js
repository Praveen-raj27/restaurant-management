import express from "express";
import cors from "cors";
import helmet from "helmet";
import prisma from "./config/prisma.js";
import cookieParser from "cookie-parser";

import authRoutes from "./modules/auth/auth.routes.js";
import employeeRoutes from "./modules/employees/employee.routes.js";
import tableRoutes from "./modules/tables/table.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import categoryRoutes from "./modules/menu/categories/category.routes.js";
import itemRoutes from "./modules/menu/items/item.routes.js";
import menuImportRoutes from "./modules/menu-import/import.routes.js";
import orderRoutes from "./modules/orders/order.routes.js";
import kitchenRoutes from "./modules/kitchen/kitchen.routes.js";
import tableSessionRoutes from "./modules/table-sessions/table-session.routes.js";
import waiterRoutes from "./modules/waiters/waiter.routes.js";

const app = express();

app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.1.24:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/v1/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            message: "Restaurant API is running",
            database: "connected"
        });
    } catch (error) {
        console.error("Database health check failed:", error);

        res.status(503).json({
            success: false,
            message: "Restaurant API is running, but database is unavailable",
            database: "disconnected"
        });
    }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/tables", tableRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/menu/categories", categoryRoutes);
app.use("/api/v1/menu/items", itemRoutes);
app.use("/api/v1/menu/imports", menuImportRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/kitchen", kitchenRoutes);
app.use("/api/v1/table-sessions", tableSessionRoutes);
app.use("/api/v1/waiters", waiterRoutes);

export default app;