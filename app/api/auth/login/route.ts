import { NextResponse } from "next/server";
import { recordAuthAudit } from "@/lib/auth/audit";
import { verifyPassword } from "@/lib/auth/password";
import {
  createAdminSessionToken,
  DEFAULT_SESSION_TTL_SECONDS,
  readSessionSecret,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const configuredUsername = process.env.ERP_ADMIN_USERNAME?.trim();
  const encodedPasswordHash = process.env.ERP_ADMIN_PASSWORD_HASH_BASE64?.trim();
  const configuredPasswordHash = encodedPasswordHash
    ? Buffer.from(encodedPasswordHash, "base64").toString("utf8")
    : process.env.ERP_ADMIN_PASSWORD_HASH;
  const sessionSecret = readSessionSecret();

  if (!configuredUsername || !configuredPasswordHash || !sessionSecret) {
    return NextResponse.json({ error: "관리자 로그인이 아직 설정되지 않았습니다." }, { status: 503 });
  }

  const validPassword = verifyPassword(password, configuredPasswordHash);
  if (username !== configuredUsername || !validPassword) {
    recordAuthAudit({ action: "login_failed", username: username || undefined, reason: "invalid_credentials" });
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const configuredTtl = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? DEFAULT_SESSION_TTL_SECONDS);
  const ttlSeconds = Number.isInteger(configuredTtl) && configuredTtl >= 900 && configuredTtl <= 86400
    ? configuredTtl
    : DEFAULT_SESSION_TTL_SECONDS;
  const token = createAdminSessionToken(configuredUsername, sessionSecret, undefined, ttlSeconds);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
  recordAuthAudit({ action: "login_succeeded", username: configuredUsername });
  return response;
}
