
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

async function main() {
  // Find the existing restaurant through its OWNER
  const ownerMembership = await prisma.restaurantMembership.findFirst({
    where: {
      status: "ACTIVE",
      role: { name: "OWNER" },
    },
  });

  if (!ownerMembership) {
    throw new Error("No active OWNER membership found");
  }

  const restaurantId = ownerMembership.restaurantId;

  // Find the restaurant-specific WAITER role
  const waiterRole = await prisma.role.findUnique({
    where: {
      restaurantId_name: {
        restaurantId,
        name: "WAITER",
      },
    },
  });

  if (!waiterRole) {
    throw new Error("WAITER role not found");
  }

  const passwordHash = await bcrypt.hash(
    "WaiterTest123",
    12
  );

  // Create or reuse the test user
  const user = await prisma.user.upsert({
    where: {
      email: "waiter.test@example.com",
    },
    update: {},
    create: {
      name: "Test Waiter",
      email: "waiter.test@example.com",
      passwordHash,
    },
  });

  // Create or reuse the restaurant membership
  await prisma.restaurantMembership.upsert({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
    update: {
      roleId: waiterRole.id,
      status: "ACTIVE",
    },
    create: {
      userId: user.id,
      restaurantId,
      roleId: waiterRole.id,
      status: "ACTIVE",
    },
  });

  console.log("WAITER test account created successfully");
  console.log("Email: waiter.test@example.com");
  console.log("Password: WaiterTest123");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
