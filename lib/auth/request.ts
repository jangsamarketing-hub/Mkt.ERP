import { recordAuthAudit } from "./audit";
import type { AppRole, AppSession } from "./session";
import { authorizeSession, readSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from "./session";

export type RequestAuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return undefined;
}

export function authenticateRequest(
  request: Request,
  options: { storeId?: string; roles?: AppRole[] } = {},
): RequestAuthResult {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  const session = verifySessionToken(token, readSessionSecret());
  if (!session) {
    recordAuthAudit({ action: "access_denied", path: new URL(request.url).pathname, reason: "missing_or_invalid_session" });
    return { ok: false, status: 401, error: "Authentication required" };
  }
  const authorization = authorizeSession(session, options);
  if (!authorization.ok) {
    recordAuthAudit({ action: "access_denied", username: session.username, path: new URL(request.url).pathname, reason: authorization.reason });
    return {
      ok: false,
      status: 403,
      error: authorization.reason === "store_forbidden" ? "Store access forbidden" : "Forbidden",
    };
  }
  return { ok: true, session };
}

export function authFailureResponse(result: Extract<RequestAuthResult, { ok: false }>) {
  return Response.json({ error: result.error }, { status: result.status });
}
