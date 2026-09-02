import { NextResponse } from "next/server";
import { getPublicFormOptions } from "@/domain/guest-portal";

export async function GET() {
  const options = await getPublicFormOptions();
  if (!options) {
    return NextResponse.json({ error: "Portal not configured" }, { status: 404 });
  }
  return NextResponse.json(options);
}
