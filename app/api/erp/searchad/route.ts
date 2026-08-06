import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get("storeId") ?? "";
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "staff", "owner"] });
  if (!auth.ok) return authFailureResponse(auth);
  if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const [configResult, latestSnapshotResult, statsResult, runsResult] = await Promise.all([
      supabase.from("erp_searchad_sync_configs").select("enabled,daily_sync_times,timezone,updated_at").eq("store_id", storeId).maybeSingle(),
      supabase.from("erp_searchad_account_snapshots").select("captured_at,campaign_count,active_campaign_count,biz_money_balance,balance_status").eq("store_id", storeId).order("captured_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("erp_searchad_campaign_daily_stats").select("stat_date,campaign_id,campaign_name,campaign_type,campaign_status,daily_budget,impressions,clicks,ad_spend,ctr,average_cpc,average_rank,conversions,synced_at").eq("store_id", storeId).order("stat_date", { ascending: false }).limit(1000),
      supabase.from("erp_searchad_sync_runs").select("status,requested_for_date,started_at,finished_at,error_message").eq("store_id", storeId).order("started_at", { ascending: false }).limit(10),
    ]);
    for (const result of [configResult, latestSnapshotResult, statsResult, runsResult]) if (result.error) throw result.error;
    const stats = statsResult.data ?? [];
    const totals = stats.reduce((sum, row) => ({
      impressions: sum.impressions + Number(row.impressions ?? 0),
      clicks: sum.clicks + Number(row.clicks ?? 0),
      spend: sum.spend + Number(row.ad_spend ?? 0),
      rankWeight: sum.rankWeight + (numberOrNull(row.average_rank) ?? 0) * Number(row.impressions ?? 0),
      rankImpressions: sum.rankImpressions + (numberOrNull(row.average_rank) === null ? 0 : Number(row.impressions ?? 0)),
      conversions: sum.conversions + (numberOrNull(row.conversions) ?? 0),
    }), { impressions: 0, clicks: 0, spend: 0, rankWeight: 0, rankImpressions: 0, conversions: 0 });
    return NextResponse.json({
      config: configResult.data ?? { enabled: false, daily_sync_times: ["06:10:00"], timezone: "Asia/Seoul" },
      latestSnapshot: latestSnapshotResult.data ?? null,
      totals: {
        ...totals,
        ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : null,
        averageCpc: totals.clicks ? totals.spend / totals.clicks : null,
        averageRank: totals.rankImpressions ? totals.rankWeight / totals.rankImpressions : null,
      },
      campaigns: stats,
      runs: runsResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SearchAd query failed" }, { status: 503 });
  }
}
