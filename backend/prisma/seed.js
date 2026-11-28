
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

  // Waiter management
  { key: "waiters.view", description: "View restaurant waiters" },
  { key: "waiters.manage", description: "Manage waiter assignments" },
  {
    key: "waiters.availability.update",
    description: "Update waiter availability",
  },
  {
    key: "waiters.orders.view",
    description: "View waiter operational orders",
  },
  {
    key: "waiters.orders.claim",
    description: "Claim unassigned ready orders",
  },
  {
    key: "waiters.orders.pickup",
    description: "Pick up assigned ready orders",
  },
  {
    key: "waiters.orders.serve",
    description: "Mark picked-up orders as served",
  },

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
      "waiters.view",
      "waiters.manage",
      "waiters.availability.update",
      "waiters.orders.view",
      "waiters.orders.claim",
      "waiters.orders.pickup",
      "waiters.orders.serve",
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
      "waiters.availability.update",
      "waiters.orders.view",
      "waiters.orders.claim",
      "waiters.orders.pickup",
      "waiters.orders.serve",
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
  // 1. Create global permissions.
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

  // 2. Validate role policies.
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

  // 3. Backfill permissions for existing restaurant roles.
  const permissionRecords = await prisma.permission.findMany({
    where: {
      key: {
        in: [
          "tables.status.update",
          "waiters.view",
          "waiters.manage",
          "waiters.availability.update",
          "waiters.orders.view",
          "waiters.orders.claim",
          "waiters.orders.pickup",
          "waiters.orders.serve",
        ],
      },
    },
    select: {
      id: true,
      key: true,
    },
  });

  const permissionMap = new Map(
    permissionRecords.map((permission) => [
      permission.key,
      permission.id,
    ]),
  );

  const existingRoles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const rolePermissionRecords = [];

  for (const role of existingRoles) {
    const rolePolicy = roles.find(
      (configuredRole) => configuredRole.name === role.name,
    );

    if (!rolePolicy) continue;

    for (const permissionKey of rolePolicy.permissions) {
      const permissionId = permissionMap.get(permissionKey);

      if (permissionId) {
        rolePermissionRecords.push({
          roleId: role.id,
          permissionId,
        });
      }
    }
  }

  const result = await prisma.rolePermission.createMany({
    data: rolePermissionRecords,
    skipDuplicates: true,
  });

  console.log(
    `${result.count} role permissions backfilled successfully`,
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
