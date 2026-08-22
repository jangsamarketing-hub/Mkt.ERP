import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { evaluateBalanceAlerts, getBalanceMonitorItems } from "@/lib/naver-searchad/balance-monitor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const items = await getBalanceMonitorItems();
    const visibleItems = auth.session.role === "admin" || auth.session.storeIds === "*" ? items : items.filter((item) => auth.session.storeIds.includes(item.storeId));
    return NextResponse.json({ items: visibleItems, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Balance monitor query failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const result = await evaluateBalanceAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Balance alert evaluation failed" }, { status: 503 });
  }
}
