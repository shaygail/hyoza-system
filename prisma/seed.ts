import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "tickets.view", description: "View tickets" },
  { key: "tickets.view_all", description: "View all tickets" },
  { key: "tickets.create", description: "Create tickets" },
  { key: "tickets.edit", description: "Edit tickets" },
  { key: "tickets.assign", description: "Assign tickets" },
  { key: "tickets.delete", description: "Delete tickets" },
  { key: "tickets.close", description: "Close tickets" },
  { key: "tickets.internal_notes", description: "Add internal notes" },
  { key: "customers.view", description: "View customers" },
  { key: "customers.edit", description: "Edit customers" },
  { key: "admin.users", description: "Manage users" },
  { key: "admin.settings", description: "Manage settings" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  administrator: PERMISSIONS.map((p) => p.key),
  agent: [
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "tickets.assign",
    "tickets.close",
    "tickets.internal_notes",
    "customers.view",
  ],
  senior_agent: [
    "tickets.view",
    "tickets.view_all",
    "tickets.create",
    "tickets.edit",
    "tickets.assign",
    "tickets.delete",
    "tickets.close",
    "tickets.internal_notes",
    "customers.view",
    "customers.edit",
  ],
  team_leader: [
    "tickets.view",
    "tickets.view_all",
    "tickets.create",
    "tickets.edit",
    "tickets.assign",
    "tickets.close",
    "tickets.internal_notes",
    "customers.view",
    "customers.edit",
  ],
  manager: [
    "tickets.view",
    "tickets.view_all",
    "tickets.create",
    "tickets.edit",
    "tickets.assign",
    "tickets.close",
    "tickets.internal_notes",
    "customers.view",
    "customers.edit",
  ],
  customer: ["tickets.view", "tickets.create", "tickets.close"],
};

function logDemoLogins() {
  console.log("Demo logins:");
  console.log("  admin@ourcloud.local / admin123");
  console.log("  agent@ourcloud.local / agent123");
}

async function main() {
  const existingUser = await prisma.user.findFirst({
    where: { email: "agent@ourcloud.local" },
  });

  if (existingUser) {
    console.log("Database already seeded — skipping.");
    logDemoLogins();
    const { seedPhase1B } = await import("./seed-phase1b");
    await seedPhase1B();
    return;
  }

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: "ourcloud" },
    update: {},
    create: {
      name: "OurCloud",
      slug: "ourcloud",
      settings: JSON.stringify({ timezone: "Europe/London" }),
    },
  });

  await prisma.ticketSequence.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, nextVal: 1001 },
  });

  const workflow = await prisma.workflow.create({
    data: {
      tenantId: tenant.id,
      name: "Default Service Desk",
      isDefault: true,
    },
  });

  const statuses = await Promise.all([
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "Open", code: "open", category: "open", color: "#3b82f6", sortOrder: 1 },
    }),
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "In Progress", code: "in_progress", category: "open", color: "#8b5cf6", sortOrder: 2 },
    }),
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "Waiting for Customer", code: "waiting_customer", category: "waiting", color: "#f59e0b", sortOrder: 3, pausesSla: true },
    }),
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "Waiting for Vendor", code: "waiting_vendor", category: "waiting", color: "#f97316", sortOrder: 4, pausesSla: true },
    }),
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "Resolved", code: "resolved", category: "resolved", color: "#22c55e", sortOrder: 5 },
    }),
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "Closed", code: "closed", category: "closed", color: "#6b7280", sortOrder: 6, isTerminal: true },
    }),
    prisma.workflowStatus.create({
      data: { workflowId: workflow.id, name: "Cancelled", code: "cancelled", category: "closed", color: "#ef4444", sortOrder: 7, isTerminal: true },
    }),
  ]);

  const [open, inProgress, waitingCustomer, waitingVendor, resolved, closed, cancelled] = statuses;

  const transitions = [
    { from: open, to: inProgress, name: "Start Work" },
    { from: open, to: waitingCustomer, name: "Waiting for Customer" },
    { from: open, to: cancelled, name: "Cancel" },
    { from: inProgress, to: waitingCustomer, name: "Waiting for Customer" },
    { from: inProgress, to: waitingVendor, name: "Waiting for Vendor" },
    { from: inProgress, to: resolved, name: "Resolve", requiredFields: '["resolution_summary"]' },
    { from: waitingCustomer, to: inProgress, name: "Resume Work" },
    { from: waitingVendor, to: inProgress, name: "Resume Work" },
    { from: resolved, to: inProgress, name: "Reopen" },
    { from: resolved, to: closed, name: "Close" },
    { from: closed, to: inProgress, name: "Reopen" },
  ];

  for (const t of transitions) {
    await prisma.workflowTransition.create({
      data: {
        workflowId: workflow.id,
        fromStatusId: t.from.id,
        toStatusId: t.to.id,
        name: t.name,
        requiredFields: t.requiredFields ?? "[]",
      },
    });
  }

  const priorities = await Promise.all([
    prisma.priority.create({ data: { tenantId: tenant.id, name: "Low", code: "low", color: "#6b7280", sortOrder: 1 } }),
    prisma.priority.create({ data: { tenantId: tenant.id, name: "Medium", code: "medium", color: "#3b82f6", sortOrder: 2 } }),
    prisma.priority.create({ data: { tenantId: tenant.id, name: "High", code: "high", color: "#f97316", sortOrder: 3 } }),
    prisma.priority.create({ data: { tenantId: tenant.id, name: "Critical", code: "critical", color: "#ef4444", sortOrder: 4 } }),
  ]);

  const ticketTypes = await Promise.all([
    prisma.ticketType.create({ data: { tenantId: tenant.id, workflowId: workflow.id, name: "Incident", code: "incident", sortOrder: 1 } }),
    prisma.ticketType.create({ data: { tenantId: tenant.id, workflowId: workflow.id, name: "Service Request", code: "service_request", sortOrder: 2 } }),
  ]);

  const allPermissions = await prisma.permission.findMany();
  const permMap = Object.fromEntries(allPermissions.map((p) => [p.key, p.id]));

  for (const [code, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        code,
        isSystem: true,
      },
    });
    for (const permKey of perms) {
      if (permMap[permKey]) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permMap[permKey] },
        });
      }
    }
  }

  const adminRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, code: "administrator" } });
  const agentRole = await prisma.role.findFirst({ where: { tenantId: tenant.id, code: "agent" } });

  const team = await prisma.team.create({
    data: { tenantId: tenant.id, name: "Service Desk" },
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@ourcloud.local",
      passwordHash: adminPassword,
      name: "System Administrator",
      userRoles: adminRole ? { create: { roleId: adminRole.id } } : undefined,
      teamMembers: { create: { teamId: team.id } },
    },
  });

  const agent = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "agent@ourcloud.local",
      passwordHash: agentPassword,
      name: "Jane Smith",
      userRoles: agentRole ? { create: { roleId: agentRole.id } } : undefined,
      teamMembers: { create: { teamId: team.id } },
    },
  });

  const org1 = await prisma.organisation.create({
    data: {
      tenantId: tenant.id,
      name: "ABC Limited",
      accountCode: "ABC001",
      email: "support@abc-limited.example",
      phone: "+44 20 7946 0958",
    },
  });

  const org2 = await prisma.organisation.create({
    data: {
      tenantId: tenant.id,
      name: "XYZ Corporation",
      accountCode: "XYZ001",
    },
  });

  const contact1 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      organisationId: org1.id,
      name: "John Smith",
      email: "john.smith@abc-limited.example",
      jobTitle: "Office Manager",
      isPrimary: true,
      portalAccess: true,
    },
  });

  await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      organisationId: org2.id,
      name: "Sarah Jones",
      email: "sarah.jones@xyz-corp.example",
      isPrimary: true,
    },
  });

  const mediumPriority = priorities.find((p) => p.code === "medium")!;
  const highPriority = priorities.find((p) => p.code === "high")!;
  const incidentType = ticketTypes.find((t) => t.code === "incident")!;
  const requestType = ticketTypes.find((t) => t.code === "service_request")!;

  const ticket1 = await prisma.ticket.create({
    data: {
      tenantId: tenant.id,
      ticketNumber: "OCSD-1001",
      subject: "Printer not printing on 3rd floor",
      description: "HP LaserJet on 3rd floor shows offline since this morning. Tried rebooting, no change.",
      organisationId: org1.id,
      contactId: contact1.id,
      assigneeId: agent.id,
      teamId: team.id,
      statusId: inProgress.id,
      priorityId: highPriority.id,
      ticketTypeId: incidentType.id,
      source: "portal",
      createdById: agent.id,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      tenantId: tenant.id,
      ticketNumber: "OCSD-1002",
      subject: "New laptop request for new starter",
      description: "New employee starting Monday needs a standard laptop with Windows 11.",
      organisationId: org2.id,
      statusId: open.id,
      priorityId: mediumPriority.id,
      ticketTypeId: requestType.id,
      source: "agent",
      createdById: admin.id,
    },
  });

  await prisma.ticketComment.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent.id,
      body: "Hi John, we've received your ticket and are looking into the printer issue.",
    },
  });

  await prisma.ticketInternalNote.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent.id,
      body: "Checked print spooler remotely — multiple jobs stuck. Cleared queue.",
    },
  });

  const activities = [
    { ticketId: ticket1.id, actorId: agent.id, eventType: "ticket.created", visibility: "customer" },
    { ticketId: ticket1.id, actorId: agent.id, eventType: "status.changed", payload: JSON.stringify({ from: "Open", to: "In Progress" }), visibility: "customer" },
    { ticketId: ticket1.id, actorId: agent.id, eventType: "ticket.assigned", payload: JSON.stringify({ assignee: "Jane Smith" }), visibility: "customer" },
    { ticketId: ticket2.id, actorId: admin.id, eventType: "ticket.created", visibility: "customer" },
  ];

  for (const a of activities) {
    await prisma.ticketActivity.create({ data: a });
  }

  console.log("Seed completed.");
  logDemoLogins();

  const { seedPhase1B } = await import("./seed-phase1b");
  await seedPhase1B();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
