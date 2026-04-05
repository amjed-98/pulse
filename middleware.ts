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
