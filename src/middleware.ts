import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/support", "/portal/login", "/embed/support"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicBranding = pathname === "/api/v1/portal/branding";
  const isApp = pathname.startsWith("/app");
  const isPortal = pathname.startsWith("/portal");
  const isSupport = pathname === "/support" || pathname.startsWith("/embed/");
  const isPublicPortal = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const roles = req.auth?.user?.roles ?? [];
  const isCustomer = roles.includes("customer");

  if (isApiAuth || isPublicBranding || isSupport) return NextResponse.next();

  if (isPublicPortal) return NextResponse.next();

  if ((isApp || isPortal) && !isLoggedIn) {
    if (isPortal) {
      const loginUrl = new URL("/portal/login", req.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage && isLoggedIn) {
    const dest = isCustomer ? "/portal" : "/app/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (isApp && isLoggedIn && isCustomer) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  if (isPortal && isLoggedIn && !isCustomer) {
    if (!roles.includes("administrator")) {
      return NextResponse.redirect(new URL("/app/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/app/:path*",
    "/portal/:path*",
    "/portal",
    "/login",
    "/support",
    "/embed/:path*",
    "/api/v1/portal/branding",
  ],
};
