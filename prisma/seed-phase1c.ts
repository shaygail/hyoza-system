import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedPhase1C() {
  const existing = await prisma.businessCalendar.findFirst({ where: { isDefault: true } });
  if (existing) {
    console.log("Phase 1C data already seeded — skipping.");
    return;
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: "ourcloud" } });
  if (!tenant) {
    console.log("No tenant found — run full seed first.");
    return;
  }

  const workflow = await prisma.workflow.findFirst({ where: { tenantId: tenant.id, isDefault: true } });
  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: "admin@ourcloud.local" },
  });
  const org1 = await prisma.organisation.findFirst({ where: { tenantId: tenant.id, name: "ABC Limited" } });

  const calendar = await prisma.businessCalendar.create({
    data: {
      tenantId: tenant.id,
      name: "UK Business Hours",
      timezone: "Europe/London",
      workDays: JSON.stringify([1, 2, 3, 4, 5]),
      startTime: "09:00",
      endTime: "17:30",
      holidays: JSON.stringify(["2026-12-25", "2026-12-26", "2026-01-01"]),
      isDefault: true,
    },
  });

  const policies = await prisma.slaPolicy.findMany({ where: { tenantId: tenant.id } });
  for (const policy of policies) {
    await prisma.slaPolicy.update({
      where: { id: policy.id },
      data: {
        businessCalendarId: calendar.id,
        escalationMinutes: Math.floor(policy.responseMinutes * 0.8),
        escalationAction: "notify",
      },
    });
  }

  if (workflow) {
    await prisma.ticketType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "problem" } },
      update: {},
      create: {
        tenantId: tenant.id,
        workflowId: workflow.id,
        name: "Problem",
        code: "problem",
        description: "Root cause analysis ticket",
        visibleInPortal: false,
        sortOrder: 4,
      },
    });
    await prisma.ticketType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "change" } },
      update: {},
      create: {
        tenantId: tenant.id,
        workflowId: workflow.id,
        name: "Change",
        code: "change",
        description: "Change request ticket",
        visibleInPortal: false,
        sortOrder: 5,
      },
    });

    const criticalTransition = await prisma.workflowTransition.findFirst({
      where: {
        workflowId: workflow.id,
        fromStatus: { code: "open" },
        toStatus: { code: "in_progress" },
      },
    });
    if (criticalTransition) {
      await prisma.workflowTransition.update({
        where: { id: criticalTransition.id },
        data: {
          conditions: JSON.stringify([
            { field: "priorityCode", operator: "in", value: ["high", "critical"] },
          ]),
        },
      });
    }
  }

  await prisma.automationRule.create({
    data: {
      tenantId: tenant.id,
      name: "Auto-tag email tickets",
      description: "Tag tickets created from email",
      trigger: "ticket.created",
      conditions: JSON.stringify([{ field: "source", operator: "eq", value: "email" }]),
      actions: JSON.stringify([{ type: "add_tag", value: "email" }]),
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.automationRule.create({
    data: {
      tenantId: tenant.id,
      name: "Notify on critical tickets",
      description: "Notify admin when critical priority ticket is created",
      trigger: "ticket.created",
      conditions: JSON.stringify([{ field: "priorityCode", operator: "eq", value: "critical" }]),
      actions: JSON.stringify([
        { type: "notify", value: "admin@ourcloud.local" },
        { type: "add_tag", value: "critical" },
      ]),
      isActive: true,
      sortOrder: 2,
    },
  });

  const kbCat = await prisma.kbCategory.create({
    data: { tenantId: tenant.id, name: "Getting Started", slug: "getting-started" },
  });

  if (admin) {
    await prisma.kbArticle.create({
      data: {
        tenantId: tenant.id,
        categoryId: kbCat.id,
        authorId: admin.id,
        title: "How to reset your password",
        slug: "how-to-reset-your-password",
        body: "If you have forgotten your password, contact your IT administrator or use the self-service portal password reset link sent to your registered email address.\n\nFor OurCloud Service Desk agents, passwords are managed by administrators in Administration → Users & Roles.",
        status: "published",
        publishedAt: new Date(),
      },
    });

    await prisma.kbArticle.create({
      data: {
        tenantId: tenant.id,
        categoryId: kbCat.id,
        authorId: admin.id,
        title: "Printer troubleshooting guide",
        slug: "printer-troubleshooting-guide",
        body: "1. Check the printer is powered on and connected to the network.\n2. Clear the print queue on your computer.\n3. Restart the print spooler service.\n4. If the issue persists, raise a ticket with the printer asset tag.",
        status: "published",
        publishedAt: new Date(),
      },
    });
  }

  await prisma.customFieldDefinition.create({
    data: {
      tenantId: tenant.id,
      label: "Affected Users",
      code: "affected_users",
      fieldType: "number",
      isRequired: false,
      sortOrder: 1,
    },
  });

  await prisma.customFieldDefinition.create({
    data: {
      tenantId: tenant.id,
      label: "Business Impact",
      code: "business_impact",
      fieldType: "select",
      options: JSON.stringify(["Low", "Medium", "High", "Critical"]),
      isRequired: false,
      sortOrder: 2,
    },
  });

  if (org1) {
    const existingContract = await prisma.contract.findFirst({
      where: { tenantId: tenant.id, organisationId: org1.id },
    });
    if (!existingContract) {
      await prisma.contract.create({
        data: {
          tenantId: tenant.id,
          organisationId: org1.id,
          name: "ABC Limited Support Agreement",
          contractType: "block_hours",
          status: "active",
          monthlyMinutes: 600,
          responseMinutes: 240,
          resolutionMinutes: 4320,
          overageHourlyRate: 150,
        },
      });
    }

    await prisma.emailMailbox.create({
      data: {
        tenantId: tenant.id,
        name: "Support Inbox",
        emailAddress: "support@ourcloud.local",
        organisationId: org1.id,
        isActive: true,
      },
    });
  }

  const permissions = await prisma.permission.findMany({
    where: {
      key: { in: ["tickets.view", "tickets.view_all", "customers.view", "customers.edit"] },
    },
  });

  const existingFinance = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: "finance" },
  });

  if (!existingFinance) {
    const financeRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: "Finance",
        code: "finance",
        description: "Custom role for billing and time review",
        isSystem: false,
      },
    });
    for (const perm of permissions) {
      await prisma.rolePermission.create({
        data: { roleId: financeRole.id, permissionId: perm.id },
      });
    }
  }

  console.log("Phase 1C seed completed.");
}

if (require.main === module) {
  seedPhase1C()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
