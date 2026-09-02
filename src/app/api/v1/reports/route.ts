import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  getTicketVolumeReport,
  getSlaComplianceReport,
  getTimeReport,
  exportTicketsCsv,
} from "@/domain/reports";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view_all");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "volume";
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
  const organisationId = searchParams.get("organisationId") ?? undefined;
  const filters = { from, to, organisationId };

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
