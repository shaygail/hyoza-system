import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function nextTicketNumber(tenantId: string) {
  const latest = await prisma.ticket.findFirst({
    where: { tenantId },
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  });
  let next = 2000;
  if (latest?.ticketNumber) {
    const n = Number(latest.ticketNumber.replace(/\D/g, ""));
    if (!Number.isNaN(n)) next = Math.max(next, n + 1);
  }
  const sequence = await prisma.ticketSequence.upsert({
    where: { tenantId },
    update: { nextVal: next },
    create: { tenantId, nextVal: next },
  });
  // Keep sequence ahead for app-created tickets
  await prisma.ticketSequence.update({
    where: { tenantId },
    data: { nextVal: sequence.nextVal + 1 },
  });
  return `OCSD-${sequence.nextVal}`;
}

function monthsAgo(n: number, day = 15) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  d.setHours(10, 0, 0, 0);
  return d;
}

function startOfMonthMonthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonthMonthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Rich MSP demo dataset: onboarding, offboarding, new/old contracts,
 * multi-month and prior-year time for monthly/yearly reporting.
 * Safe to re-run — skips if MSP demo orgs already exist.
 */
export async function seedMspDemo() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "ourcloud" } });
  if (!tenant) {
    console.log("No tenant found — run full seed first.");
    return;
  }

  const existing = await prisma.organisation.findFirst({
    where: { tenantId: tenant.id, accountCode: "MSP-ONBOARD" },
    include: { tickets: { take: 1 } },
  });
  if (existing && existing.tickets.length > 0) {
    console.log("MSP demo data already seeded — skipping.");
    return;
  }

  // Clean partial failed seed
  if (existing) {
    await prisma.organisation.deleteMany({
      where: {
        tenantId: tenant.id,
        accountCode: { in: ["MSP-ONBOARD", "MSP-ACTIVE", "MSP-RENEW", "MSP-OFFBOARD"] },
      },
    });
  }

  const [
    admin,
    agent,
    openStatus,
    inProgress,
    resolvedStatus,
    closedStatus,
    priorities,
    ticketTypes,
    workTypes,
    rateCard,
    team,
  ] = await Promise.all([
    prisma.user.findFirst({ where: { tenantId: tenant.id, email: "admin@ourcloud.local" } }),
    prisma.user.findFirst({ where: { tenantId: tenant.id, email: "agent@ourcloud.local" } }),
    prisma.workflowStatus.findFirst({ where: { code: "open", workflow: { tenantId: tenant.id } } }),
    prisma.workflowStatus.findFirst({ where: { code: "in_progress", workflow: { tenantId: tenant.id } } }),
    prisma.workflowStatus.findFirst({ where: { code: "resolved", workflow: { tenantId: tenant.id } } }),
    prisma.workflowStatus.findFirst({ where: { code: "closed", workflow: { tenantId: tenant.id } } }),
    prisma.priority.findMany({ where: { tenantId: tenant.id } }),
    prisma.ticketType.findMany({ where: { tenantId: tenant.id } }),
    prisma.workType.findMany({ where: { tenantId: tenant.id } }),
    prisma.rateCard.findFirst({ where: { tenantId: tenant.id } }),
    prisma.team.findFirst({ where: { tenantId: tenant.id } }),
  ]);

  if (!admin || !agent || !openStatus || !inProgress || !resolvedStatus || !closedStatus) {
    console.log("Core seed data missing — run npm run db:seed first.");
    return;
  }

  const priority = Object.fromEntries(priorities.map((p) => [p.code, p.id]));
  const type = Object.fromEntries(ticketTypes.map((t) => [t.code, t.id]));
  const work = Object.fromEntries(workTypes.map((w) => [w.code, w.id]));
  const createdById = agent.id;

  // --- Demo staff users (MSP console roles) ---
  const roles = await prisma.role.findMany({ where: { tenantId: tenant.id } });
  const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r.id]));
  const password = await bcrypt.hash("demo123", 10);

  const staffUsers = [
    { email: "manager@ourcloud.local", name: "Morgan Manager", role: "manager" },
    { email: "finance@ourcloud.local", name: "Finn Finance", role: "finance" },
    { email: "senior@ourcloud.local", name: "Sam Senior", role: "senior_agent" },
    { email: "lead@ourcloud.local", name: "Taylor TeamLead", role: "team_leader" },
  ];

  const staff: Record<string, string> = {
    admin: admin.id,
    agent: agent.id,
  };

  for (const u of staffUsers) {
    const roleId = roleByCode[u.role];
    if (!roleId) continue;
    let user = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: u.email,
          passwordHash: password,
          name: u.name,
          userRoles: { create: { roleId } },
          ...(team ? { teamMembers: { create: { teamId: team.id } } } : {}),
        },
      });
    }
    staff[u.role] = user.id;
  }

  // --- Accounts ---
  const onboard = await prisma.organisation.create({
    data: {
      tenantId: tenant.id,
      name: "Northwind Onboarding Ltd",
      accountCode: "MSP-ONBOARD",
      status: "active",
      email: "it@northwind-onboard.example",
      phone: "+64 9 555 0101",
      billingEmail: "ap@northwind-onboard.example",
      taxId: "NZ-111-222-333",
      paymentTerms: "Net 14",
      notes: "DEMO: New client mid-onboarding. Use for onboarding ticket walkthrough.",
      address: "12 Quay Street, Auckland",
    },
  });

  const activeClient = await prisma.organisation.create({
    data: {
      tenantId: tenant.id,
      name: "Harbour Managed Services",
      accountCode: "MSP-ACTIVE",
      status: "active",
      email: "support@harbour-msp.example",
      billingEmail: "accounts@harbour-msp.example",
      taxId: "NZ-444-555-666",
      paymentTerms: "Net 30",
      notes: "DEMO: Steady-state MSP client with active retainer + monthly reporting history.",
    },
  });

  const renewClient = await prisma.organisation.create({
    data: {
      tenantId: tenant.id,
      name: "Legacy Steel Co",
      accountCode: "MSP-RENEW",
      status: "active",
      email: "ops@legacysteel.example",
      billingEmail: "finance@legacysteel.example",
      paymentTerms: "Net 30",
      notes: "DEMO: Old expired contract + new draft renewal. Compare old vs new contracts.",
    },
  });

  const offboard = await prisma.organisation.create({
    data: {
      tenantId: tenant.id,
      name: "Sunset Retail Group",
      accountCode: "MSP-OFFBOARD",
      status: "active",
      email: "hr@sunset-retail.example",
      billingEmail: "ap@sunset-retail.example",
      notes: "DEMO: Client winding down — offboarding tickets, reclaim assets, cancel contract.",
    },
  });

  // Contacts
  const [cOnboard, cActive, cRenew, cOffboard] = await Promise.all([
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        organisationId: onboard.id,
        name: "Alex Ng",
        email: "alex.ng@northwind-onboard.example",
        jobTitle: "Office Manager",
        isPrimary: true,
        portalAccess: true,
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        organisationId: activeClient.id,
        name: "Priya Patel",
        email: "priya.patel@harbour-msp.example",
        jobTitle: "IT Coordinator",
        isPrimary: true,
        portalAccess: true,
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        organisationId: renewClient.id,
        name: "Chris Doyle",
        email: "chris.doyle@legacysteel.example",
        jobTitle: "Operations Lead",
        isPrimary: true,
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        organisationId: offboard.id,
        name: "Jamie Cole",
        email: "jamie.cole@sunset-retail.example",
        jobTitle: "HR Manager",
        isPrimary: true,
      },
    }),
  ]);

  await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      organisationId: offboard.id,
      name: "Leaver Example",
      email: "leaver@sunset-retail.example",
      jobTitle: "Store Associate (leaving)",
      isPrimary: false,
    },
  });

  // --- Contracts: new, active, old/expired, draft renewal, cancelling ---
  const cardId = rateCard?.id;

  await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      organisationId: onboard.id,
      rateCardId: cardId,
      name: "Northwind Onboarding — Ramp (New)",
      contractType: "block_hours",
      status: "active",
      currency: "NZD",
      monthlyMinutes: 300,
      overageHourlyRate: 165,
      startDate: monthsAgo(0, 1),
      notes: "New contract started this month during onboarding.",
    },
  });

  const harbourContract = await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      organisationId: activeClient.id,
      rateCardId: cardId,
      name: "Harbour Monthly Retainer 2025–2026",
      contractType: "retainer",
      status: "active",
      currency: "NZD",
      monthlyMinutes: 800,
      retainerAmount: 4500,
      overageHourlyRate: 155,
      startDate: monthsAgo(14, 1),
      notes: "Long-running retainer — use for monthly & yearly reports.",
    },
  });

  await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      organisationId: renewClient.id,
      rateCardId: cardId,
      name: "Legacy Steel — Old Block Hours (Expired)",
      contractType: "block_hours",
      status: "expired",
      currency: "NZD",
      monthlyMinutes: 400,
      overageHourlyRate: 140,
      startDate: monthsAgo(24, 1),
      endDate: monthsAgo(2, 28),
      notes: "OLD CONTRACT — expired two months ago.",
    },
  });

  await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      organisationId: renewClient.id,
      rateCardId: cardId,
      name: "Legacy Steel — Renewal T&M (Draft)",
      contractType: "tm",
      status: "draft",
      currency: "NZD",
      overageHourlyRate: 160,
      startDate: monthsAgo(0, 1),
      notes: "NEW CONTRACT draft — pending signature for renewal.",
    },
  });

  await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      organisationId: offboard.id,
      rateCardId: cardId,
      name: "Sunset Retail — Cancelling",
      contractType: "block_hours",
      status: "cancelled",
      currency: "NZD",
      monthlyMinutes: 200,
      overageHourlyRate: 150,
      startDate: monthsAgo(18, 1),
      endDate: monthsAgo(0, 5),
      notes: "Cancelled as part of offboarding.",
    },
  });

  // --- Assets ---
  const laptop = await prisma.asset.create({
    data: {
      tenantId: tenant.id,
      organisationId: onboard.id,
      assetTag: "NW-LAP-001",
      name: "Alex Ng Laptop (onboarding)",
      assetType: "Laptop",
      manufacturer: "Dell",
      model: "Latitude 5540",
      status: "active",
    },
  });

  await prisma.asset.create({
    data: {
      tenantId: tenant.id,
      organisationId: offboard.id,
      assetTag: "SR-LAP-088",
      name: "Leaver laptop (reclaim)",
      assetType: "Laptop",
      manufacturer: "Lenovo",
      status: "active",
      notes: "Pending wipe and return during offboarding.",
    },
  });

  // --- Tickets: onboarding ---
  async function makeTicket(opts: {
    orgId: string;
    contactId?: string;
    subject: string;
    description: string;
    statusId: string;
    priorityCode?: string;
    typeCode?: string;
    assigneeId?: string;
    assetId?: string;
    createdAt: Date;
    resolvedAt?: Date;
    closedAt?: Date;
  }) {
    const ticketNumber = await nextTicketNumber(tenant.id);
    return prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        ticketNumber,
        subject: opts.subject,
        description: opts.description,
        organisationId: opts.orgId,
        contactId: opts.contactId,
        assigneeId: opts.assigneeId ?? agent.id,
        teamId: team?.id,
        statusId: opts.statusId,
        priorityId: priority[opts.priorityCode ?? "medium"] ?? priorities[0].id,
        ticketTypeId: type[opts.typeCode ?? "service_request"] ?? ticketTypes[0].id,
        assetId: opts.assetId,
        createdById,
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
        resolvedAt: opts.resolvedAt,
        closedAt: opts.closedAt,
        source: "agent",
      },
    });
  }

  const onboardTickets = [
    await makeTicket({
      orgId: onboard.id,
      contactId: cOnboard.id,
      subject: "[Onboarding] Create M365 tenant & admin accounts",
      description: "MSP onboarding checklist: provision Microsoft 365 tenant, admin MFA, naming standards.",
      statusId: closedStatus.id,
      typeCode: "service_request",
      priorityCode: "high",
      createdAt: monthsAgo(0, 3),
      resolvedAt: monthsAgo(0, 4),
      closedAt: monthsAgo(0, 5),
    }),
    await makeTicket({
      orgId: onboard.id,
      contactId: cOnboard.id,
      subject: "[Onboarding] Deploy laptop for Alex Ng",
      description: "Image device, join Entra ID, install company apps, BitLocker.",
      statusId: inProgress.id,
      typeCode: "service_request",
      priorityCode: "medium",
      assetId: laptop.id,
      createdAt: monthsAgo(0, 6),
    }),
    await makeTicket({
      orgId: onboard.id,
      contactId: cOnboard.id,
      subject: "[Onboarding] Email migration kickoff",
      description: "Migrate mailboxes from legacy host to M365.",
      statusId: openStatus.id,
      typeCode: "service_request",
      priorityCode: "high",
      createdAt: monthsAgo(0, 8),
    }),
  ];

  // Offboarding tickets
  const offboardTickets = [
    await makeTicket({
      orgId: offboard.id,
      contactId: cOffboard.id,
      subject: "[Offboarding] Disable leaver accounts & revoke MFA",
      description: "Disable AD/Entra user, revoke sessions, forward mail 30 days.",
      statusId: inProgress.id,
      typeCode: "service_request",
      priorityCode: "high",
      createdAt: monthsAgo(0, 2),
    }),
    await makeTicket({
      orgId: offboard.id,
      contactId: cOffboard.id,
      subject: "[Offboarding] Reclaim & wipe laptop SR-LAP-088",
      description: "Collect device, wipe, update asset register, close contract.",
      statusId: openStatus.id,
      typeCode: "task",
      priorityCode: "medium",
      createdAt: monthsAgo(0, 2),
    }),
    await makeTicket({
      orgId: offboard.id,
      contactId: cOffboard.id,
      subject: "[Offboarding] Final invoice & knowledge transfer",
      description: "Produce final billing period invoice and hand over documentation.",
      statusId: openStatus.id,
      typeCode: "service_request",
      priorityCode: "medium",
      assigneeId: staff.finance ?? admin.id,
      createdAt: monthsAgo(0, 1),
    }),
  ];

  // Active client tickets across months for reporting
  const harbourTicketIds: string[] = [];
  for (let m = 0; m <= 13; m++) {
    const created = monthsAgo(m, 8);
    const resolved = monthsAgo(m, 12);
    const t = await makeTicket({
      orgId: activeClient.id,
      contactId: cActive.id,
      subject: `Harbour monthly support — ${created.toLocaleString("en", { month: "short", year: "numeric" })}`,
      description: "Recurring support work for monthly report demo.",
      statusId: m === 0 ? inProgress.id : closedStatus.id,
      typeCode: m % 3 === 0 ? "incident" : "service_request",
      priorityCode: m % 4 === 0 ? "high" : "medium",
      createdAt: created,
      resolvedAt: m === 0 ? undefined : resolved,
      closedAt: m === 0 ? undefined : resolved,
    });
    harbourTicketIds.push(t.id);
  }

  // Renewal client tickets
  await makeTicket({
    orgId: renewClient.id,
    contactId: cRenew.id,
    subject: "Contract renewal discussion — review old vs new rates",
    description: "Compare expired block-hours contract with draft T&M renewal.",
    statusId: openStatus.id,
    typeCode: "service_request",
    priorityCode: "medium",
    assigneeId: staff.manager ?? admin.id,
    createdAt: monthsAgo(0, 4),
  });

  // --- Time entries spanning months + prior year ---
  const remoteId = work.remote;
  const onsiteId = work.onsite;
  const adminWt = work.admin;

  async function logTime(opts: {
    ticketId: string;
    orgId: string;
    contractId?: string;
    minutes: number;
    when: Date;
    billable?: boolean;
    status?: string;
    workTypeId?: string;
    userId?: string;
    notes?: string;
  }) {
    return prisma.timeEntry.create({
      data: {
        tenantId: tenant.id,
        ticketId: opts.ticketId,
        userId: opts.userId ?? agent.id,
        organisationId: opts.orgId,
        contractId: opts.contractId,
        workTypeId: opts.workTypeId ?? remoteId,
        durationMinutes: opts.minutes,
        isBillable: opts.billable ?? true,
        status: opts.status ?? "approved",
        approvedById: opts.status === "submitted" ? null : staff.team_leader ?? admin.id,
        approvedAt: opts.status === "submitted" ? null : opts.when,
        notes: opts.notes,
        createdAt: opts.when,
        updatedAt: opts.when,
      },
    });
  }

  // Onboarding time this month
  await logTime({
    ticketId: onboardTickets[0].id,
    orgId: onboard.id,
    minutes: 180,
    when: monthsAgo(0, 3),
    workTypeId: remoteId,
    notes: "M365 tenant setup",
  });
  await logTime({
    ticketId: onboardTickets[1].id,
    orgId: onboard.id,
    minutes: 120,
    when: monthsAgo(0, 6),
    workTypeId: onsiteId,
    status: "submitted",
    notes: "Laptop imaging — pending approval",
  });

  // Offboarding time
  await logTime({
    ticketId: offboardTickets[0].id,
    orgId: offboard.id,
    minutes: 60,
    when: monthsAgo(0, 2),
    workTypeId: adminWt,
    billable: true,
  });

  // Harbour: 14 months of approved billable time for monthly + yearly views
  for (let m = 0; m <= 13; m++) {
    const ticketId = harbourTicketIds[m];
    const base = monthsAgo(m, 10);
    await logTime({
      ticketId,
      orgId: activeClient.id,
      contractId: harbourContract.id,
      minutes: 240 + (m % 5) * 30,
      when: base,
      workTypeId: remoteId,
      userId: agent.id,
      notes: `Retainer remote support month-${m}`,
    });
    await logTime({
      ticketId,
      orgId: activeClient.id,
      contractId: harbourContract.id,
      minutes: 90 + (m % 3) * 15,
      when: monthsAgo(m, 18),
      workTypeId: onsiteId,
      userId: staff.senior_agent ?? agent.id,
      notes: `Onsite visit month-${m}`,
    });
    if (m % 2 === 0) {
      await logTime({
        ticketId,
        orgId: activeClient.id,
        contractId: harbourContract.id,
        minutes: 45,
        when: monthsAgo(m, 20),
        workTypeId: adminWt,
        billable: false,
        notes: "Non-billable admin",
      });
    }
  }

  // --- Billing periods + invoices (recent months + last year sample) ---
  let invoiceSeq = await prisma.invoice.count({ where: { tenantId: tenant.id } });

  for (const m of [0, 1, 2, 11, 12]) {
    const start = startOfMonthMonthsAgo(m);
    const end = endOfMonthMonthsAgo(m);
    const label = start.toLocaleString("en", { month: "short", year: "numeric" });

    const period = await prisma.billingPeriod.create({
      data: {
        tenantId: tenant.id,
        organisationId: activeClient.id,
        contractId: harbourContract.id,
        label: `Harbour ${label}`,
        status: m === 0 ? "open" : "closed",
        startDate: start,
        endDate: end,
        closedAt: m === 0 ? null : end,
        createdAt: start,
      },
    });

    await prisma.timeEntry.updateMany({
      where: {
        tenantId: tenant.id,
        organisationId: activeClient.id,
        contractId: harbourContract.id,
        createdAt: { gte: start, lte: end },
        status: "approved",
      },
      data: { billingPeriodId: period.id },
    });

    if (m !== 0) {
      invoiceSeq += 1;
      const subtotal = 4500 + m * 50;
      const tax = Math.round(subtotal * 0.15 * 100) / 100;
      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          organisationId: activeClient.id,
          contractId: harbourContract.id,
          billingPeriodId: period.id,
          invoiceNumber: `INV-MSP-${String(invoiceSeq).padStart(4, "0")}`,
          status: "approved",
          currency: "NZD",
          subtotal,
          taxAmount: tax,
          total: Math.round((subtotal + tax) * 100) / 100,
          issuedAt: end,
          createdAt: end,
          notes: `Monthly retainer invoice for ${label}`,
          lines: {
            create: [
              {
                description: `Monthly retainer — ${label}`,
                quantity: 1,
                unitAmount: 4500,
                lineTotal: 4500,
                lineType: "retainer",
              },
              ...(m % 3 === 0
                ? [
                    {
                      description: "Overage hours",
                      quantity: 2,
                      unitAmount: 155,
                      lineTotal: 310,
                      lineType: "overage",
                    },
                  ]
                : []),
            ],
          },
        },
      });
    }
  }

  console.log("MSP demo data seeded.");
  console.log("MSP demo accounts (password: demo123):");
  console.log("  manager@ourcloud.local  — Manager");
  console.log("  finance@ourcloud.local  — Finance");
  console.log("  senior@ourcloud.local   — Senior Agent");
  console.log("  lead@ourcloud.local     — Team Leader");
  console.log("Demo orgs: MSP-ONBOARD, MSP-ACTIVE, MSP-RENEW, MSP-OFFBOARD");
}

if (require.main === module) {
  seedMspDemo()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
