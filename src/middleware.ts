import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

const PLAYER_PAGE = /^\/tornei\/\d+\/gioca\/?$/;

function isPublicApi(pathname: string, method: string): boolean {
  if (method !== "GET") return false;
  if (pathname === "/api/tournaments") return true;
  if (/^\/api\/tournaments\/\d+\/ranking\/?$/.test(pathname)) return true;
  if (/^\/api\/tournaments\/\d+\/players\/\d+\/opponents\/?$/.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (PLAYER_PAGE.test(pathname)) {
    return NextResponse.next();
  }

  if (isPublicApi(pathname, request.method)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tornei/:path*", "/giocatori", "/api/:path*"],
};
