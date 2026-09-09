import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/permissions";
import {
  getTicketVolumeReport,
  getSlaComplianceReport,
  getTimeReport,
  exportTicketsCsv,
  getMonthlyAccountReport,
  exportMonthlyAccountReportCsv,
  getYearlyAccountReport,
  exportYearlyAccountReportCsv,
} from "@/domain/reports";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "volume";
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
  const organisationId = searchParams.get("organisationId") ?? undefined;
  const yearMonth = searchParams.get("month") ?? undefined;
  const yearParam = searchParams.get("year");
  const filters = { from, to, organisationId };

  // Monthly / yearly account reports
  if (
    type === "monthly" ||
    type === "monthly-export" ||
    type === "yearly" ||
    type === "yearly-export"
  ) {
    const allowed =
      (await hasPermission(session.user.id, "tickets.view_all")) ||
      (await hasPermission(session.user.id, "billing.view")) ||
      (await hasPermission(session.user.id, "contracts.view"));
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
      if (type === "yearly" || type === "yearly-export") {
        const year = yearParam ? Number(yearParam) : new Date().getFullYear();
        if (!year || year < 2000) {
          return NextResponse.json({ error: "Invalid year" }, { status: 400 });
        }
        if (type === "yearly-export") {
          const csv = await exportYearlyAccountReportCsv(
            session.user.tenantId,
            year,
            organisationId
          );
          return new NextResponse(csv, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename="yearly-account-report-${year}.csv"`,
            },
          });
        }
        return NextResponse.json(
          await getYearlyAccountReport(session.user.tenantId, year, organisationId)
        );
      }

      const month =
        yearMonth ??
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      if (type === "monthly-export") {
        const csv = await exportMonthlyAccountReportCsv(
          session.user.tenantId,
          month,
          organisationId
        );
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="monthly-account-report-${month}.csv"`,
          },
        });
      }

      return NextResponse.json(
        await getMonthlyAccountReport(session.user.tenantId, month, organisationId)
      );
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  await requirePermission(session.user.id, "tickets.view_all");

  if (type === "export") {
    const csv = await exportTicketsCsv(session.user.tenantId, filters);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="tickets-export.csv"',
      },
    });
  }

  if (type === "sla") {
    return NextResponse.json(await getSlaComplianceReport(session.user.tenantId, filters));
  }
  if (type === "time") {
    return NextResponse.json(await getTimeReport(session.user.tenantId, filters));
  }

  return NextResponse.json(await getTicketVolumeReport(session.user.tenantId, filters));
}
