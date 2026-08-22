import { NextResponse } from "next/server";
import { recordAuthAudit } from "@/lib/auth/audit";
import { verifyPassword } from "@/lib/auth/password";
import {
  createAdminSessionToken,
  createSessionToken,
  DEFAULT_SESSION_TTL_SECONDS,
  readSessionSecret,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Development-stage fixed administrator approved for the internal ERP rollout.
// Remove this bootstrap path before opening the service to external client users.
const BOOTSTRAP_ADMIN_USERNAME = "jayden";
const BOOTSTRAP_ADMIN_PASSWORD_HASH = "scrypt$16384$8$1$mktosbootstrap20260803$865dadccc00e37dbdbfabda884c9e5648b16560e0504b646781b148b81cb55e841dc1e02d542424fc3f712e45ea69282f48019fe9baa6b4babe4ffa5ce037cdf";

type StaffAccount = {
  username: string;
  passwordHash: string;
  managerName: string;
};

function readStaffAccounts() {
  const raw = process.env.ERP_STAFF_ACCOUNTS_JSON?.trim();
  if (!raw) return [] as StaffAccount[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is StaffAccount => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Partial<StaffAccount>;
      return typeof candidate.username === "string"
        && typeof candidate.passwordHash === "string"
        && typeof candidate.managerName === "string"
        && Boolean(candidate.username.trim())
        && Boolean(candidate.passwordHash.trim())
        && Boolean(candidate.managerName.trim());
    }).map((entry) => ({
      username: entry.username.trim(),
      passwordHash: entry.passwordHash.trim(),
      managerName: entry.managerName.trim(),
    }));
  } catch {
    return [] as StaffAccount[];
  }
}

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

  if (!sessionSecret) {
    return NextResponse.json({ error: "관리자 로그인이 아직 설정되지 않았습니다." }, { status: 503 });
  }

  const validConfiguredPassword = configuredPasswordHash && configuredUsername
    ? username === configuredUsername && verifyPassword(password, configuredPasswordHash)
    : false;
  const validBootstrapPassword = username === BOOTSTRAP_ADMIN_USERNAME
    && verifyPassword(password, BOOTSTRAP_ADMIN_PASSWORD_HASH);
  const staffAccount = readStaffAccounts().find((account) => account.username === username && verifyPassword(password, account.passwordHash));
  if (!validConfiguredPassword && !validBootstrapPassword && !staffAccount) {
    recordAuthAudit({ action: "login_failed", username: username || undefined, reason: "invalid_credentials" });
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const configuredTtl = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? DEFAULT_SESSION_TTL_SECONDS);
  const ttlSeconds = Number.isInteger(configuredTtl) && configuredTtl >= 900 && configuredTtl <= 86400
    ? configuredTtl
    : DEFAULT_SESSION_TTL_SECONDS;
  const authenticatedUsername = validBootstrapPassword ? BOOTSTRAP_ADMIN_USERNAME : (staffAccount?.username ?? configuredUsername!);
  let token: string;
  if (staffAccount) {
    const { data, error } = await getSupabaseAdmin()
      .from("erp_stores")
      .select("id")
      .eq("manager_name", staffAccount.managerName)
      .neq("lifecycle_status", "archived");
    if (error) {
      return NextResponse.json({ error: "담당 매장 연결을 확인하지 못했습니다." }, { status: 503 });
    }
    token = createSessionToken({
      userId: `staff:${staffAccount.username}`,
      username: staffAccount.username,
      role: "staff",
      storeIds: (data ?? []).map((store) => store.id),
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
    }, sessionSecret);
  } else {
    token = createAdminSessionToken(authenticatedUsername, sessionSecret, undefined, ttlSeconds);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
  recordAuthAudit({ action: "login_succeeded", username: authenticatedUsername });
  return response;
}
