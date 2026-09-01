import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableTransitions } from "@/domain/tickets";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const transitions = await getAvailableTransitions(id);
  return NextResponse.json(transitions);
}
