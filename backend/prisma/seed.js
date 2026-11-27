import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { key: "dashboard.view", description: "View dashboard" },

  { key: "employees.view", description: "View employees" },
  { key: "employees.manage", description: "Manage employees" },

  { key: "tables.view", description: "View tables" },
  { key: "tables.manage", description: "Manage tables" },
  {
    key: "tables.status.update",
    description: "Update operational table status",
  },

  { key: "menu.view", description: "View menu" },
  { key: "menu.manage", description: "Manage menu" },

  { key: "orders.view", description: "View orders" },
  { key: "orders.create", description: "Create orders" },
  { key: "orders.manage", description: "Manage orders" },
  { key: "orders.update_status", description: "Update order status" },

  { key: "kitchen.view", description: "View kitchen tickets" },
  { key: "kitchen.manage", description: "Manage kitchen tickets" },

  { key: "payments.view", description: "View payments" },
  { key: "payments.process", description: "Process payments" },

  { key: "reports.view", description: "View reports" },
  { key: "restaurant.manage", description: "Manage restaurant settings" },
];

const roles = [
  {
    name: "OWNER",
    description: "Full restaurant access",
    permissions: permissions.map((permission) => permission.key),
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

async function main() {
  // 1. Create global permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        description: permission.description,
      },
      create: permission,
    });
  }

  console.log(`${permissions.length} permissions seeded successfully`);

  // 2. Validate role policies against the permission catalogue
  const permissionKeys = new Set(
    permissions.map((permission) => permission.key),
  );

  for (const role of roles) {
    for (const permissionKey of role.permissions) {
      if (!permissionKeys.has(permissionKey)) {
        throw new Error(
          `Unknown permission "${permissionKey}" in role "${role.name}"`,
        );
      }
    }
  }

  console.log(`${roles.length} role policies configured successfully`);
    // 3. Backfill tables.status.update for existing restaurant roles
  const statusPermission = await prisma.permission.findUnique({
    where: {
      key: "tables.status.update",
    },
    select: {
      id: true,
    },
  });

  const eligibleRoles = await prisma.role.findMany({
    where: {
      name: {
        in: ["OWNER", "MANAGER", "WAITER"],
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const rolePermissionRecords = eligibleRoles.map((role) => ({
    roleId: role.id,
    permissionId: statusPermission.id,
  }));

  const result = await prisma.rolePermission.createMany({
    data: rolePermissionRecords,
    skipDuplicates: true,
  });

  console.log(
    `Table status permission backfilled for ${result.count} role assignments`,
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
