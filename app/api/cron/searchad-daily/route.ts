import { NextResponse } from "next/server";
import { evaluateBalanceAlerts } from "@/lib/naver-searchad/balance-monitor";
import { getEnabledSearchAdStoreIds, syncStoreSearchAd } from "@/lib/naver-searchad/sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const storeIds = await getEnabledSearchAdStoreIds();
  const results = await Promise.all(storeIds.map((storeId) => syncStoreSearchAd(storeId, { runKind: "daily" })));
  let balanceAlerts: unknown = null;
  let balanceAlertError: string | null = null;
  try {
    balanceAlerts = await evaluateBalanceAlerts();
  } catch (error) {
    // SearchAd collection must remain available while the alert migration is being rolled out.
    balanceAlertError = error instanceof Error ? error.message : "Balance alert evaluation failed";
  }
  return NextResponse.json({ ok: true, results, balanceAlerts, balanceAlertError });
}
