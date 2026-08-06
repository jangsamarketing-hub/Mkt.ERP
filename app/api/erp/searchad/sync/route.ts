import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { syncStoreSearchAd } from "@/lib/naver-searchad/sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { storeId?: string; statDate?: string };
  const storeId = String(body.storeId ?? "").trim();
  const auth = authenticateRequest(request, { storeId, roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  if (body.statDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.statDate)) return NextResponse.json({ error: "statDate must be YYYY-MM-DD" }, { status: 400 });
  const result = await syncStoreSearchAd(storeId, { runKind: "manual", statDate: body.statDate });
  return NextResponse.json(result, { status: result.ok ? 200 : result.status === "skipped" ? 409 : 502 });
}
