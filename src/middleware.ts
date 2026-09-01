import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isApp = req.nextUrl.pathname.startsWith("/app");

  if (isApiAuth) return NextResponse.next();

  if (isApp && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*", "/login"],
};
