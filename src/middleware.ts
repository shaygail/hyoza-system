import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicApi =
    pathname.startsWith("/api/v1/public/") || pathname === "/api/v1/portal/branding";
  const isApp = pathname.startsWith("/app");
  const isPortal = pathname.startsWith("/portal");
  const isSupport = pathname.startsWith("/support") || pathname.startsWith("/embed/");
  const roles = req.auth?.user?.roles ?? [];
  const isCustomer = roles.includes("customer");

  // Redirect legacy customer login to public support
  if (pathname === "/portal/login") {
    return NextResponse.redirect(new URL("/support", req.url));
  }

  if (isApiAuth || isPublicApi || isSupport) return NextResponse.next();

  if ((isApp || isPortal) && !isLoggedIn) {
    if (isPortal) {
      return NextResponse.redirect(new URL("/support", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage && isLoggedIn) {
    const dest = isCustomer ? "/support" : "/app/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (isApp && isLoggedIn && isCustomer) {
    return NextResponse.redirect(new URL("/support", req.url));
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
    "/support/:path*",
    "/support",
    "/embed/:path*",
    "/api/v1/public/:path*",
    "/api/v1/portal/branding",
  ],
};
