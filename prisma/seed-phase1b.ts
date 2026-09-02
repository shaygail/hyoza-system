import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedPhase1B() {
  const existing = await prisma.queue.findFirst({ where: { isSystem: true } });
  if (existing) {
    console.log("Phase 1B data already seeded — skipping.");
    return;
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: "ourcloud" } });
  if (!tenant) {
    console.log("No tenant found — run full seed first.");
    return;
  }

  const priorities = await prisma.priority.findMany({ where: { tenantId: tenant.id } });
  const priorityMap = Object.fromEntries(priorities.map((p) => [p.code, p.id]));

  for (const [code, name, resp, res] of [
    ["low", "Low SLA", 480, 7200],
    ["medium", "Medium SLA", 240, 4320],
    ["high", "High SLA", 60, 480],
    ["critical", "Critical SLA", 15, 240],
  ] as const) {
    if (priorityMap[code]) {
      await prisma.slaPolicy.create({
        data: {
          tenantId: tenant.id,
          name,
          priorityId: priorityMap[code],
          responseMinutes: resp,
          resolutionMinutes: res,
          isDefault: code === "medium",
        },
      });
    }
  }

  await prisma.ticketType.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "task" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Task",
      code: "task",
      description: "Internal task",
      visibleInPortal: false,
      sortOrder: 3,
    },
  });

  const hardware = await prisma.category.create({
    data: { tenantId: tenant.id, name: "Hardware", code: "hardware", sortOrder: 1 },
  });
  const software = await prisma.category.create({
    data: { tenantId: tenant.id, name: "Software", code: "software", sortOrder: 2 },
  });
  await prisma.category.create({
    data: { tenantId: tenant.id, name: "Printer", code: "printer", parentId: hardware.id, sortOrder: 1 },
  });
  await prisma.category.create({
    data: { tenantId: tenant.id, name: "Laptop", code: "laptop", parentId: hardware.id, sortOrder: 2 },
  });
  await prisma.category.create({
    data: { tenantId: tenant.id, name: "Email", code: "email", parentId: software.id, sortOrder: 1 },
  });

  const org1 = await prisma.organisation.findFirst({ where: { tenantId: tenant.id, name: "ABC Limited" } });
  if (org1) {
    await prisma.asset.create({
      data: {
        tenantId: tenant.id,
        organisationId: org1.id,
        assetTag: "HP-LAPTOP-023",
        name: "John Smith Laptop",
        assetType: "Laptop",
        manufacturer: "HP",
        model: "EliteBook 840",
        operatingSystem: "Windows 11",
        location: "3rd Floor",
      },
    });
  }

  const systemQueues = [
    {
      name: "My Tickets",
      filterDefinition: JSON.stringify({
        conditions: [{ field: "assigneeId.my", operator: "eq", value: true }],
        logic: "AND",
      }),
    },
    {
      name: "Unassigned",
      filterDefinition: JSON.stringify({
        conditions: [
          { field: "assigneeId", operator: "is_null" },
          { field: "status.category", operator: "neq", value: "closed" },
        ],
        logic: "AND",
      }),
    },
    {
      name: "Critical",
      filterDefinition: JSON.stringify({
        conditions: [
          { field: "priority.code", operator: "eq", value: "critical" },
          { field: "status.category", operator: "neq", value: "closed" },
        ],
        logic: "AND",
      }),
    },
    {
      name: "SLA At Risk",
      filterDefinition: JSON.stringify({
        conditions: [{ field: "status.category", operator: "eq", value: "open" }],
        logic: "AND",
      }),
    },
    {
      name: "Waiting for Customer",
      filterDefinition: JSON.stringify({
        conditions: [{ field: "status.code", operator: "eq", value: "waiting_customer" }],
        logic: "AND",
      }),
    },
    {
      name: "Waiting for Vendor",
      filterDefinition: JSON.stringify({
        conditions: [{ field: "status.code", operator: "eq", value: "waiting_vendor" }],
        logic: "AND",
      }),
    },
  ];

  for (const q of systemQueues) {
    await prisma.queue.create({
      data: {
        tenantId: tenant.id,
        name: q.name,
        filterDefinition: q.filterDefinition,
        isSystem: true,
        visibility: "global",
      },
    });
  }

  for (const [code, name] of [
    ["remote", "Remote Support"],
    ["onsite", "Onsite"],
    ["admin", "Administration"],
  ] as const) {
    await prisma.workType.create({
      data: { tenantId: tenant.id, name, code, isBillableDefault: code !== "admin" },
    });
  }

  const agent = await prisma.user.findFirst({ where: { email: "agent@ourcloud.local" } });
  if (agent) {
    const myQueue = await prisma.queue.findFirst({ where: { tenantId: tenant.id, name: "My Tickets" } });
    if (myQueue) {
      await prisma.userQueuePin.create({ data: { userId: agent.id, queueId: myQueue.id } });
    }
  }

  // Customer portal user linked to John Smith contact
  const contact1 = await prisma.contact.findFirst({
    where: { tenantId: tenant.id, email: "john.smith@abc-limited.example" },
  });
  const customerRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, code: "customer" } });

  if (contact1 && customerRole) {
    const existingCustomer = await prisma.user.findFirst({ where: { email: "john.smith@abc-limited.example" } });
    if (!existingCustomer) {
      const pw = await bcrypt.hash("customer123", 10);
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: "john.smith@abc-limited.example",
          passwordHash: pw,
          name: "John Smith",
          contactId: contact1.id,
          userRoles: { create: { roleId: customerRole.id } },
        },
      });
    }
  }

  // Apply SLA to existing tickets
  const tickets = await prisma.ticket.findMany({ where: { tenantId: tenant.id } });
  for (const ticket of tickets) {
    const policy = await prisma.slaPolicy.findFirst({
      where: { tenantId: tenant.id, priorityId: ticket.priorityId },
    });
    if (policy) {
      const responseDueAt = new Date(ticket.createdAt.getTime() + policy.responseMinutes * 60 * 1000);
      const resolutionDueAt = new Date(ticket.createdAt.getTime() + policy.resolutionMinutes * 60 * 1000);
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { slaPolicyId: policy.id, responseDueAt, resolutionDueAt, dueAt: resolutionDueAt },
      });
    }
  }

  console.log("Phase 1B seed completed.");
  console.log("Customer portal login: john.smith@abc-limited.example / customer123");
}

if (require.main === module) {
  seedPhase1B()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
