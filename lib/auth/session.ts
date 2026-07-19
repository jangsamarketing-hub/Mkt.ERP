import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "erp_admin_session";
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AppRole = "admin" | "staff" | "owner";

export type AppSession = {
  userId: string;
  username: string;
  role: AppRole;
  storeIds: string[] | "*";
  issuedAt: number;
  expiresAt: number;
};

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function readSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function createAdminSessionToken(
  username: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
) {
  const payload: AppSession = {
    userId: "fixed-admin",
    username,
    role: "admin",
    storeIds: "*",
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + ttlSeconds,
  };
  return createSessionToken(payload, secret);
}

export function createSessionToken(payload: AppSession, secret: string) {
  if (secret.length < 32) throw new Error("AUTH_SESSION_SECRET must be at least 32 characters.");
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string | null, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!token || !secret) return null;
  const [encodedPayload, suppliedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !suppliedSignature || rest.length) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AppSession;
    if (payload.role !== "admin" && payload.role !== "staff" && payload.role !== "owner") return null;
    if (!payload.userId || !payload.username || !Number.isFinite(payload.expiresAt)) return null;
    if (payload.expiresAt <= nowSeconds) return null;
    if (payload.storeIds !== "*" && !Array.isArray(payload.storeIds)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function canAccessStore(session: AppSession, storeId: string) {
  if (!storeId) return false;
  return session.role === "admin" || session.storeIds === "*" || session.storeIds.includes(storeId);
}

export function authorizeSession(session: AppSession, options: { storeId?: string; roles?: AppRole[] } = {}) {
  if (options.roles && !options.roles.includes(session.role)) {
    return { ok: false as const, reason: "role_forbidden" as const };
  }
  if (options.storeId && !canAccessStore(session, options.storeId)) {
    return { ok: false as const, reason: "store_forbidden" as const };
  }
  return { ok: true as const };
}
