import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublic =
    nextUrl.pathname === "/login" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/sabaki-logo") ||
    nextUrl.pathname.startsWith("/uploads") ||
    nextUrl.pathname === "/favicon.ico" ||
    nextUrl.pathname === "/api/health";

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/cotizaciones", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
