import { NextResponse } from "next/server";
import { recordAuthAudit } from "@/lib/auth/audit";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  recordAuthAudit({ action: "logout" });
  return response;
}
