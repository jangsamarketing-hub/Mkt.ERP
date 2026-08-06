import { NextResponse } from "next/server";
import { getEnabledSearchAdStoreIds, syncStoreSearchAd } from "@/lib/naver-searchad/sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const storeIds = await getEnabledSearchAdStoreIds();
  const results = await Promise.all(storeIds.map((storeId) => syncStoreSearchAd(storeId, { runKind: "daily" })));
  return NextResponse.json({ ok: true, results });
}
