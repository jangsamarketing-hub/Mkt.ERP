import type { AppSession } from "./session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

export type AccessDecision =
  | { action: "allow" }
  | { action: "unauthorized" }
  | { action: "redirect"; destination: string };

export function decideRequestAccess(pathname: string, search: string, session: AppSession | null): AccessDecision {
  if (PUBLIC_PATHS.has(pathname) || session) return { action: "allow" };
  if (pathname.startsWith("/api/")) return { action: "unauthorized" };
  const nextPath = `${pathname}${search}`;
  return { action: "redirect", destination: `/login?next=${encodeURIComponent(nextPath)}` };
}
