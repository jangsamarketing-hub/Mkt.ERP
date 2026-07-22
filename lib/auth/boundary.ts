import type { AppSession } from "./session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

function isPublicStorePath(pathname: string) {
  return pathname.startsWith("/store/") || pathname.startsWith("/api/public/stores/");
}

export type AccessDecision =
  | { action: "allow" }
  | { action: "unauthorized" }
  | { action: "redirect"; destination: string };

export function decideRequestAccess(pathname: string, search: string, session: AppSession | null): AccessDecision {
  if (PUBLIC_PATHS.has(pathname) || isPublicStorePath(pathname) || session) return { action: "allow" };
  if (pathname.startsWith("/api/")) return { action: "unauthorized" };
  const nextPath = `${pathname}${search}`;
  return { action: "redirect", destination: `/login?next=${encodeURIComponent(nextPath)}` };
}
