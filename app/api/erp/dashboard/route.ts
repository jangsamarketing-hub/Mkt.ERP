import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { buildTimeBuckets, normalizeGranularity } from "@/lib/analytics/time-buckets";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PlaceSnapshot = {
  storeId: string;
  start: string;
  end: string;
  inflow: number | null;
  source: "csv" | "json";
  uploadedAt: string;
};

function numberOrNull(value: unknown) {
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

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);

  try {
    const url = new URL(request.url);
    const granularity = normalizeGranularity(url.searchParams.get("granularity"));
    const buckets = buildTimeBuckets(url.searchParams.get("date") ?? "", granularity);
    const overallStart = buckets[0].start;
    const overallEnd = buckets.at(-1)?.end ?? buckets[0].end;
    const supabase = getSupabaseAdmin();

    const [storeResult, csvResult, jsonResult, salesResult] = await Promise.all([
      supabase.from("erp_stores").select("id,name,manager_name,category,region,naver_mid").neq("lifecycle_status", "archived").order("name"),
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
    ]);
    const firstError = storeResult.error ?? csvResult.error ?? jsonResult.error ?? salesResult.error;
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

    const stores = (storeResult.data ?? []).map((store) => {
      const storeSnapshots = snapshots.filter((snapshot) => snapshot.storeId === store.id);
      const inflowBuckets = buckets.map((bucket) => pickExactSnapshot(storeSnapshots, bucket.start, bucket.end)?.inflow ?? null);
      const salesBuckets = buckets.map((bucket) => {
        const rows = salesRows.filter((row) => row.store_id === store.id && row.transaction_date >= bucket.start && row.transaction_date <= bucket.end);
        if (!rows.length) return null;
        return rows.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
      });

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
