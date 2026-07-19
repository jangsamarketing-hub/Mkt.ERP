type AuthAuditEvent = {
  action: "login_succeeded" | "login_failed" | "logout" | "access_denied";
  username?: string;
  path?: string;
  reason?: string;
};

export function recordAuthAudit(event: AuthAuditEvent) {
  console.info(JSON.stringify({
    type: "auth_audit",
    occurredAt: new Date().toISOString(),
    ...event,
  }));
}
