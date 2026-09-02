import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isApp = req.nextUrl.pathname.startsWith("/app");
  const isPortal = req.nextUrl.pathname.startsWith("/portal");
  const roles = req.auth?.user?.roles ?? [];
  const isCustomer = roles.includes("customer");

  if (isApiAuth) return NextResponse.next();

  if ((isApp || isPortal) && !isLoggedIn) {
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
  matcher: ["/app/:path*", "/portal/:path*", "/portal", "/login"],
};
