import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectXeroStub } from "@/domain/xero";

/** OAuth callback placeholder — exchanges code when XERO_CLIENT_* env vars are set. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/app/admin/xero?error=denied", request.url));
  }

  // Stub: mark connected. Real implementation exchanges `code` for tokens.
  await connectXeroStub(session.user.tenantId, {
    tenantName: code ? "Xero Connected Org" : "Demo Xero Org",
  });

  return NextResponse.redirect(new URL("/app/admin/xero?connected=1", request.url));
}
