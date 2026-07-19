import { NextRequest, NextResponse } from "next/server";
import { decideRequestAccess } from "@/lib/auth/boundary";
import { readSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token, readSessionSecret());
  const decision = decideRequestAccess(pathname, search, session);
  if (decision.action === "allow") return NextResponse.next();

  if (decision.action === "unauthorized") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.redirect(new URL(decision.destination, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
