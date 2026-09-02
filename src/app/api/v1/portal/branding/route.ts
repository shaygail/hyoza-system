import { NextResponse } from "next/server";
import { getPublicPortalConfig } from "@/domain/portal-public";

export async function GET() {
  const config = await getPublicPortalConfig();
  if (!config) {
    return NextResponse.json({ error: "Portal not configured" }, { status: 404 });
  }
  return NextResponse.json(config);
}
