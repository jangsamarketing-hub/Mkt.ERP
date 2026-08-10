import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { parsePlaceInsightCsv, PLACE_CSV_PARSER_VERSION, type PlaceMetricRow } from "@/lib/place-csv/parser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "erp-private-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type PlaceUploadResponse = {
  id: string;
  store_id: string;
  file_name: string;
  period_start: string;
  period_end: string;
  summary: unknown;
  warnings: unknown;
  status: string;
  uploaded_at: string;
  parser_version?: string | null;
  keywords: unknown[];
  channels: unknown[];
  hours: unknown[];
  weekdays: unknown[];
  source: "csv" | "json";
};

function safeFileName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function summaryFromParsed(parsed: ReturnType<typeof parsePlaceInsightCsv>) {
  return {
    storeName: parsed.storeName,
    sourceVersion: parsed.sourceVersion,
    granularity: parsed.granularity,
    metrics: parsed.metrics,
    placeInflow: parsed.metrics.placeInflow?.current ?? null,
    reservationOrder: parsed.metrics.reservationOrder?.current ?? null,
    smartCall: parsed.metrics.smartCall?.current ?? null,
    reviewRegister: parsed.metrics.reviewRegister?.current ?? null,
  };
}

function rowValues(row: PlaceMetricRow) {
  return {
    visit_count: row.count,
    previous_count: row.previous,
    diff_count: row.diff,
    diff_rate: row.rate,
  };
}

function numberOrNull(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function jsonSummary(payload: unknown) {
  const report = payload && typeof payload === "object"
    ? (payload as { modules?: { report?: { reconciled_metrics?: Record<string, { current?: unknown }>; direct_metrics?: Record<string, { current?: unknown }> } } }).modules?.report
    : undefined;
  const metrics = report?.reconciled_metrics ?? report?.direct_metrics ?? {};
  return {
    placeInflow: numberOrNull(metrics.placeInflow?.current),
    reservationOrder: numberOrNull(metrics.reservationOrder?.current),
    smartCall: numberOrNull(metrics.smartCall?.current),
    reviewRegister: numberOrNull(metrics.reviewRegister?.current),
  };
}

type JsonMetricRow = {
  keyword?: unknown;
  channel?: unknown;
  label?: unknown;
  pv?: unknown;
  previous?: unknown;
  diff?: unknown;
  rate?: unknown;
};

function jsonPlaceRows(payload: unknown, kind: "keyword" | "channel") {
  const place = payload && typeof payload === "object"
    ? (payload as { modules?: { place?: { keywords?: JsonMetricRow[]; channels?: JsonMetricRow[] } } }).modules?.place
    : undefined;
  const rows = kind === "keyword" ? place?.keywords : place?.channels;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const label = String(kind === "keyword" ? row.keyword ?? row.label ?? "" : row.channel ?? row.label ?? "").trim();
    const count = numberOrNull(row.pv);
    if (!label || count === null) return [];
    return [{
      [kind === "keyword" ? "keyword" : "channel"]: label,
      visit_count: count,
      previous_count: numberOrNull(row.previous),
      diff_count: numberOrNull(row.diff),
      diff_rate: numberOrNull(row.rate),
    }];
  });
}

export async function GET(request: Request) {
  const initialAuth = authenticateRequest(request);
  if (!initialAuth.ok) return authFailureResponse(initialAuth);
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId")?.trim();
    const start = url.searchParams.get("start")?.trim();
    const end = url.searchParams.get("end")?.trim();
    if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    const storeAuth = authenticateRequest(request, { storeId });
    if (!storeAuth.ok) return authFailureResponse(storeAuth);

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("erp_place_csv_uploads")
      .select("id,store_id,file_name,period_start,period_end,summary,warnings,status,parser_version,uploaded_at")
      .eq("store_id", storeId)
      .eq("status", "ready")
      .order("period_start", { ascending: false });
    if (start) query = query.gte("period_start", start);
    if (end) query = query.lte("period_end", end);

    let jsonQuery = supabase
      .from("erp_naver_place_json_imports")
      .select("id,store_id,file_name,period_start,period_end,raw_storage_path,warnings,status,uploaded_at")
      .eq("store_id", storeId)
      .eq("status", "ready")
      .order("period_start", { ascending: false });
    if (start) jsonQuery = jsonQuery.gte("period_start", start);
    if (end) jsonQuery = jsonQuery.lte("period_end", end);

    const latestCsvQuery = supabase
      .from("erp_place_csv_uploads")
      .select("uploaded_at")
      .eq("store_id", storeId)
      .eq("status", "ready")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestJsonQuery = supabase
      .from("erp_naver_place_json_imports")
      .select("uploaded_at")
      .eq("store_id", storeId)
      .eq("status", "ready")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const [csvResult, jsonResult, latestCsvResult, latestJsonResult] = await Promise.all([query, jsonQuery, latestCsvQuery, latestJsonQuery]);
    const firstError = csvResult.error ?? jsonResult.error ?? latestCsvResult.error ?? latestJsonResult.error;
    if (firstError) throw firstError;
    const uploads = csvResult.data ?? [];
    const uploadIds = (uploads ?? []).map((upload) => upload.id);

    const [keywordResult, channelResult, timeResult, weekdayResult, jsonUploads] = await Promise.all([
      uploadIds.length ? supabase.from("erp_place_keyword_rows").select("upload_id,keyword,visit_count,previous_count,diff_count,diff_rate,purpose_class").in("upload_id", uploadIds).order("visit_count", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      uploadIds.length ? supabase.from("erp_place_channel_rows").select("upload_id,channel,visit_count,previous_count,diff_count,diff_rate").in("upload_id", uploadIds).order("visit_count", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      uploadIds.length ? supabase.from("erp_place_time_rows").select("upload_id,hour,visit_count,previous_count,diff_count,diff_rate").in("upload_id", uploadIds).order("hour") : Promise.resolve({ data: [], error: null }),
      uploadIds.length ? supabase.from("erp_place_weekday_rows").select("upload_id,weekday,visit_count,previous_count,diff_count,diff_rate").in("upload_id", uploadIds) : Promise.resolve({ data: [], error: null }),
      Promise.all((jsonResult.data ?? []).map(async (upload) => {
        const download = await supabase.storage.from(BUCKET).download(upload.raw_storage_path);
        if (download.error || !download.data) return null;
        try {
          const payload = JSON.parse(await download.data.text());
          return {
            ...upload,
            summary: jsonSummary(payload),
            keywords: jsonPlaceRows(payload, "keyword"),
            channels: jsonPlaceRows(payload, "channel"),
            hours: [],
            weekdays: [],
            source: "json",
          };
        } catch {
          return null;
        }
      })),
    ]);
    const childError = keywordResult.error ?? channelResult.error ?? timeResult.error ?? weekdayResult.error;
    if (childError) throw childError;

    const csvUploads: PlaceUploadResponse[] = uploads.map((upload) => ({
        ...upload,
        keywords: (keywordResult.data ?? []).filter((row) => row.upload_id === upload.id),
        channels: (channelResult.data ?? []).filter((row) => row.upload_id === upload.id),
        hours: (timeResult.data ?? []).filter((row) => row.upload_id === upload.id),
        weekdays: (weekdayResult.data ?? []).filter((row) => row.upload_id === upload.id),
        source: "csv",
      }));
    const latestByPeriod = new Map<string, PlaceUploadResponse>();
    csvUploads.forEach((upload) => latestByPeriod.set(`${upload.period_start}:${upload.period_end}`, upload));
    jsonUploads.filter((upload): upload is NonNullable<typeof upload> => Boolean(upload)).forEach((upload) => {
      latestByPeriod.set(`${upload.period_start}:${upload.period_end}`, upload as PlaceUploadResponse);
    });
    const lastUploadedAt = [latestCsvResult.data?.uploaded_at, latestJsonResult.data?.uploaded_at]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? null;
    return NextResponse.json({ uploads: [...latestByPeriod.values()].sort((left, right) => right.period_start.localeCompare(left.period_start)), lastUploadedAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Place upload query failed" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const initialAuth = authenticateRequest(request);
  if (!initialAuth.ok) return authFailureResponse(initialAuth);
  let uploadId = "";
  try {
    const form = await request.formData();
    const storeId = String(form.get("storeId") ?? "").trim();
    const file = form.get("file");
    if (!storeId || !(file instanceof File)) {
      return NextResponse.json({ error: "storeId and CSV file are required" }, { status: 400 });
    }
    const storeAuth = authenticateRequest(request, { storeId });
    if (!storeAuth.ok) return authFailureResponse(storeAuth);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "CSV file only" }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "CSV file must be 10 MB or smaller" }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const text = bytes.toString("utf8");
    const parsed = parsePlaceInsightCsv(text);
    const fileHash = createHash("sha256").update(bytes).digest("hex");
    const supabase = getSupabaseAdmin();

    const { data: store, error: storeError } = await supabase
      .from("erp_stores")
      .select("id,name")
      .eq("id", storeId)
      .single();
    if (storeError || !store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    if (parsed.storeName && parsed.storeName !== store.name) {
      parsed.warnings.push(`CSV store name (${parsed.storeName}) differs from selected store (${store.name}).`);
    }

    const { data: duplicate } = await supabase
      .from("erp_place_csv_uploads")
      .select("id,store_id,file_name,period_start,period_end,summary,warnings,status,uploaded_at")
      .eq("store_id", storeId)
      .eq("period_start", parsed.periodStart)
      .eq("period_end", parsed.periodEnd)
      .eq("file_hash", fileHash)
      .maybeSingle();
    if (duplicate) return NextResponse.json({ upload: duplicate, duplicate: true });

    const storagePath = `${storeId}/place/${parsed.periodStart}_${parsed.periodEnd}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: "text/csv",
      upsert: false,
    });
    if (storageError) throw storageError;

    const { data: upload, error: uploadError } = await supabase
      .from("erp_place_csv_uploads")
      .insert({
        store_id: storeId,
        file_name: file.name,
        period_start: parsed.periodStart,
        period_end: parsed.periodEnd,
        raw_storage_path: storagePath,
        summary: summaryFromParsed(parsed),
        file_hash: fileHash,
        status: "processing",
        parser_version: PLACE_CSV_PARSER_VERSION,
        warnings: parsed.warnings,
        is_current: false,
      })
      .select("id")
      .single();
    if (uploadError) throw uploadError;
    uploadId = upload.id;

    const period = { period_start: parsed.periodStart, period_end: parsed.periodEnd };
    const inserts = [
      parsed.keywords.length
        ? supabase.from("erp_place_keyword_rows").insert(parsed.keywords.map((row) => ({ upload_id: uploadId, store_id: storeId, keyword: row.label, purpose_class: row.purposeClass ?? null, ...rowValues(row), ...period })))
        : Promise.resolve({ error: null }),
      parsed.channels.length
        ? supabase.from("erp_place_channel_rows").insert(parsed.channels.map((row) => ({ upload_id: uploadId, store_id: storeId, channel: row.label, ...rowValues(row), ...period })))
        : Promise.resolve({ error: null }),
      parsed.hours.length
        ? supabase.from("erp_place_time_rows").insert(parsed.hours.map((row) => ({ upload_id: uploadId, store_id: storeId, hour: row.hour, ...rowValues(row), ...period })))
        : Promise.resolve({ error: null }),
      parsed.weekdays.length
        ? supabase.from("erp_place_weekday_rows").insert(parsed.weekdays.map((row) => ({ upload_id: uploadId, store_id: storeId, weekday: row.label, ...rowValues(row), ...period })))
        : Promise.resolve({ error: null }),
    ];
    const insertResults = await Promise.all(inserts);
    const insertError = insertResults.find((result) => result.error)?.error;
    if (insertError) throw insertError;

    const now = new Date().toISOString();
    const { error: replaceError } = await supabase
      .from("erp_place_csv_uploads")
      .update({ is_current: false, replaced_at: now, updated_at: now })
      .eq("store_id", storeId)
      .eq("period_start", parsed.periodStart)
      .eq("period_end", parsed.periodEnd)
      .eq("is_current", true)
      .neq("id", uploadId);
    if (replaceError) throw replaceError;

    const { data: readyUpload, error: readyError } = await supabase
      .from("erp_place_csv_uploads")
      .update({ status: "ready", is_current: true, updated_at: now })
      .eq("id", uploadId)
      .select("id,store_id,file_name,period_start,period_end,summary,warnings,status,parser_version,uploaded_at")
      .single();
    if (readyError) throw readyError;

    return NextResponse.json({ upload: readyUpload, duplicate: false }, { status: 201 });
  } catch (error) {
    if (uploadId) {
      const supabase = getSupabaseAdmin();
      await supabase.from("erp_place_csv_uploads").update({
        status: "failed",
        parse_error: error instanceof Error ? error.message : "Unknown parse failure",
        is_current: false,
        updated_at: new Date().toISOString(),
      }).eq("id", uploadId);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Place upload failed" },
      { status: 500 },
    );
  }
}
