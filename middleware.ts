import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/projects",
  "/team",
  "/settings",
];

const AUTH_ROUTES = ["/login", "/signup"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { response, session } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const requestId = crypto.randomUUID();

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-pathname", pathname);
  response.headers.set("x-request-method", request.method);

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url, { headers: response.headers });
  }

  if (matchesPrefix(pathname, AUTH_ROUTES) && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url, { headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics/:path*",
    "/projects/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
