import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { buildTimeBuckets, normalizeGranularity } from "@/lib/analytics/time-buckets";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { activeFourWeekStart, buildFourWeekWorkPlan, workPlanDate } from "@/lib/work-plan";

type PlaceSnapshot = {
  storeId: string;
  start: string;
  end: string;
  inflow: number | null;
  source: "csv" | "json";
  uploadedAt: string;
};

type WorkUpdateRow = {
  store_id: string;
  task_date: string | null;
  evidence_text: string | null;
  evidence_urls: unknown;
};

type SearchAdStatRow = {
  store_id: string;
  stat_date: string;
  impressions: number | string | null;
  clicks: number | string | null;
  ad_spend: number | string | null;
  conversions: number | string | null;
};

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function jsonInflow(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as { modules?: { report?: { reconciled_metrics?: { placeInflow?: { current?: unknown } }; direct_metrics?: { placeInflow?: { current?: unknown } } } } };
  return numberOrNull(source.modules?.report?.reconciled_metrics?.placeInflow?.current)
    ?? numberOrNull(source.modules?.report?.direct_metrics?.placeInflow?.current);
}

function pickExactSnapshot(snapshots: PlaceSnapshot[], start: string, end: string) {
  return snapshots
    .filter((snapshot) => snapshot.start === start && snapshot.end === end && snapshot.inflow !== null)
    .sort((left, right) => {
      if (left.source !== right.source) return left.source === "json" ? -1 : 1;
      return right.uploadedAt.localeCompare(left.uploadedAt);
    })[0] ?? null;
}

async function ensureCurrentWorkPlans(stores: Array<{ id: string; management_start_date: string | null; lifecycle_status: string | null }>) {
  const supabase = getSupabaseAdmin();
  const plan = buildFourWeekWorkPlan();
  await Promise.all(stores.map(async (store) => {
    if (!store.management_start_date || store.lifecycle_status === "archived") return;
    const cycleStart = activeFourWeekStart(store.management_start_date);
    const cycleEnd = workPlanDate(cycleStart, { week: 4, dayOffset: 27, title: "" });
    const { data: existing, error } = await supabase
      .from("erp_store_work_updates")
      .select("task_week,task_date,title")
      .eq("store_id", store.id)
      .gte("task_date", cycleStart)
      .lte("task_date", cycleEnd);
    if (error) throw error;
    const keys = new Set((existing ?? []).map((item) => `${item.task_week}|${item.task_date}|${item.title}`));
    const missing = plan
      .map((item) => ({
        store_id: store.id,
        task_week: item.week,
        task_date: workPlanDate(cycleStart, item),
        title: item.title,
        owner: "company",
        status: "pending",
        public_visible: true,
        evidence_urls: [],
      }))
      .filter((item) => !keys.has(`${item.task_week}|${item.task_date}|${item.title}`));
    if (!missing.length) return;
    const { error: insertError } = await supabase.from("erp_store_work_updates").insert(missing);
    if (insertError) throw insertError;
  }));
}

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);

  try {
    const url = new URL(request.url);
    const granularity = normalizeGranularity(url.searchParams.get("granularity"));
    const buckets = buildTimeBuckets(url.searchParams.get("date") ?? "", granularity);
    const overallStart = buckets[0].start;
    const overallEnd = buckets.at(-1)?.end ?? buckets[0].end;
    const supabase = getSupabaseAdmin();

    let storesQuery = supabase.from("erp_stores").select("id,name,manager_name,category,region,naver_mid,management_start_date,lifecycle_status").neq("lifecycle_status", "archived").order("name");
    if (auth.session.storeIds !== "*") storesQuery = storesQuery.in("id", auth.session.storeIds);
    const storeResult = await storesQuery;
    if (storeResult.error) throw storeResult.error;
    await ensureCurrentWorkPlans(storeResult.data ?? []);
    const [csvResult, jsonResult, salesResult, searchAdSnapshotResult, searchAdStatsResult, workUpdateResult] = await Promise.all([
      supabase
        .from("erp_place_csv_uploads")
        .select("store_id,period_start,period_end,summary,uploaded_at")
        .eq("status", "ready")
        .gte("period_start", overallStart)
        .lte("period_end", overallEnd),
      supabase
        .from("erp_naver_place_json_imports")
        .select("store_id,period_start,period_end,raw_storage_path,uploaded_at")
        .eq("status", "ready")
        .gte("period_start", overallStart)
        .lte("period_end", overallEnd),
      supabase
        .from("erp_card_daily_summary")
        .select("store_id,transaction_date,net_sales,net_payment_count")
        .gte("transaction_date", overallStart)
        .lte("transaction_date", overallEnd),
      supabase
        .from("erp_searchad_account_snapshots")
        .select("store_id,captured_at,biz_money_balance,balance_status,campaign_count,active_campaign_count")
        .order("captured_at", { ascending: false }),
      supabase
        .from("erp_searchad_campaign_daily_stats")
        .select("store_id,stat_date,impressions,clicks,ad_spend,conversions")
        .order("stat_date", { ascending: false })
        .limit(20000),
      supabase
        .from("erp_store_work_updates")
        .select("store_id,task_date,evidence_text,evidence_urls")
        .gte("task_date", overallStart)
        .lte("task_date", overallEnd),
    ]);
    const firstError = csvResult.error ?? jsonResult.error ?? salesResult.error ?? searchAdSnapshotResult.error ?? searchAdStatsResult.error ?? workUpdateResult.error;
    if (firstError) throw firstError;

    const csvSnapshots: PlaceSnapshot[] = (csvResult.data ?? []).map((upload) => {
      const summary = (upload.summary ?? {}) as { placeInflow?: unknown };
      return {
        storeId: upload.store_id,
        start: upload.period_start,
        end: upload.period_end,
        inflow: numberOrNull(summary.placeInflow),
        source: "csv",
        uploadedAt: upload.uploaded_at,
      };
    });

    const jsonSnapshots = await Promise.all((jsonResult.data ?? []).map(async (upload) => {
      const download = await supabase.storage.from("erp-private-uploads").download(upload.raw_storage_path);
      if (download.error || !download.data) return null;
      try {
        const payload = JSON.parse(await download.data.text()) as unknown;
        return {
          storeId: upload.store_id,
          start: upload.period_start,
          end: upload.period_end,
          inflow: jsonInflow(payload),
          source: "json" as const,
          uploadedAt: upload.uploaded_at,
        } satisfies PlaceSnapshot;
      } catch {
        return null;
      }
    }));
    const snapshots: PlaceSnapshot[] = [...csvSnapshots, ...jsonSnapshots.filter((snapshot): snapshot is Exclude<typeof snapshot, null> => Boolean(snapshot))];
    const salesRows = salesResult.data ?? [];
    const workUpdates = (workUpdateResult.data ?? []) as WorkUpdateRow[];
    const latestBalanceByStore = new Map<string, {
      balance: number | null;
      status: string;
      capturedAt: string;
      campaignCount: number;
      activeCampaignCount: number;
    }>();
    for (const snapshot of searchAdSnapshotResult.data ?? []) {
      if (!latestBalanceByStore.has(snapshot.store_id)) {
        latestBalanceByStore.set(snapshot.store_id, {
          balance: snapshot.balance_status === "available" ? numberOrNull(snapshot.biz_money_balance) : null,
          status: snapshot.balance_status,
          capturedAt: snapshot.captured_at,
          campaignCount: Number(snapshot.campaign_count ?? 0),
          activeCampaignCount: Number(snapshot.active_campaign_count ?? 0),
        });
      }
    }

    const latestSearchAdDateByStore = new Map<string, string>();
    const latestSearchAdStatsByStore = new Map<string, { impressions: number; clicks: number; adSpend: number; conversions: number }>();
    for (const row of (searchAdStatsResult.data ?? []) as SearchAdStatRow[]) {
      const latestDate = latestSearchAdDateByStore.get(row.store_id);
      if (latestDate && row.stat_date !== latestDate) continue;
      if (!latestDate) latestSearchAdDateByStore.set(row.store_id, row.stat_date);
      const current = latestSearchAdStatsByStore.get(row.store_id) ?? { impressions: 0, clicks: 0, adSpend: 0, conversions: 0 };
      current.impressions += numberOrNull(row.impressions) ?? 0;
      current.clicks += numberOrNull(row.clicks) ?? 0;
      current.adSpend += numberOrNull(row.ad_spend) ?? 0;
      current.conversions += numberOrNull(row.conversions) ?? 0;
      latestSearchAdStatsByStore.set(row.store_id, current);
    }

    const stores = (storeResult.data ?? []).map((store) => {
      const storeSnapshots = snapshots.filter((snapshot) => snapshot.storeId === store.id);
      const inflowBuckets = buckets.map((bucket) => pickExactSnapshot(storeSnapshots, bucket.start, bucket.end)?.inflow ?? null);
      const salesBuckets = buckets.map((bucket) => {
        const rows = salesRows.filter((row) => row.store_id === store.id && row.transaction_date >= bucket.start && row.transaction_date <= bucket.end);
        if (!rows.length) return null;
        return rows.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
      });
      const taskBuckets = buckets.map((bucket) => {
        const bucketUpdates = workUpdates.filter((update) => update.store_id === store.id && update.task_date && update.task_date >= bucket.start && update.task_date <= bucket.end);
        if (!bucketUpdates.length) return null;
        const writtenCount = bucketUpdates.filter((update) => {
          const hasText = Boolean(update.evidence_text?.trim());
          const hasAttachment = Array.isArray(update.evidence_urls) && update.evidence_urls.some((url) => typeof url === "string" && url.trim().length > 0);
          return hasText || hasAttachment;
        }).length;
        return Math.round((writtenCount / bucketUpdates.length) * 100);
      });

      const searchAdSnapshot = latestBalanceByStore.get(store.id);
      const searchAdStats = latestSearchAdStatsByStore.get(store.id);
      return {
        id: store.id,
        name: store.name,
        managerName: store.manager_name,
        category: store.category,
        region: store.region,
        naverMid: store.naver_mid,
        inflowBuckets,
        salesBuckets,
        currentInflow: inflowBuckets.at(-1) ?? null,
        previousInflow: inflowBuckets.at(-2) ?? null,
        currentSales: salesBuckets.at(-1) ?? null,
        previousSales: salesBuckets.at(-2) ?? null,
        taskBuckets,
        currentTaskProgress: taskBuckets.at(-1) ?? null,
        previousTaskProgress: taskBuckets.at(-2) ?? null,
        bizMoney: searchAdSnapshot?.balance ?? null,
        bizMoneyStatus: searchAdSnapshot?.status ?? "unavailable",
        bizMoneyUpdatedAt: searchAdSnapshot?.capturedAt ?? null,
        searchAdStatDate: latestSearchAdDateByStore.get(store.id) ?? null,
        searchAdImpressions: searchAdStats?.impressions ?? null,
        searchAdClicks: searchAdStats?.clicks ?? null,
        searchAdCtr: searchAdStats && searchAdStats.impressions > 0 ? (searchAdStats.clicks / searchAdStats.impressions) * 100 : null,
        searchAdSpend: searchAdStats?.adSpend ?? null,
        searchAdAverageCpc: searchAdStats && searchAdStats.clicks > 0 ? searchAdStats.adSpend / searchAdStats.clicks : null,
        searchAdConversions: searchAdStats?.conversions ?? null,
        searchAdCampaignCount: searchAdSnapshot?.campaignCount ?? null,
        searchAdActiveCampaignCount: searchAdSnapshot?.activeCampaignCount ?? null,
      };
    });

    return NextResponse.json({
      granularity,
      buckets,
      range: { start: overallStart, end: overallEnd },
      stores,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dashboard query failed" },
      { status: 503 },
    );
  }
}
