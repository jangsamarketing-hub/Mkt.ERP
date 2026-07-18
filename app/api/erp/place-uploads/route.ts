import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { parsePlaceInsightCsv, PLACE_CSV_PARSER_VERSION, type PlaceMetricRow } from "@/lib/place-csv/parser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "erp-private-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId")?.trim();
    const start = url.searchParams.get("start")?.trim();
    const end = url.searchParams.get("end")?.trim();
    if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("erp_place_csv_uploads")
      .select("id,store_id,file_name,period_start,period_end,summary,warnings,status,parser_version,uploaded_at")
      .eq("store_id", storeId)
      .eq("status", "ready")
      .eq("is_current", true)
      .order("period_start", { ascending: false });
    if (start) query = query.gte("period_start", start);
    if (end) query = query.lte("period_end", end);

    const { data: uploads, error } = await query;
    if (error) throw error;
    const uploadIds = (uploads ?? []).map((upload) => upload.id);
    if (!uploadIds.length) return NextResponse.json({ uploads: [] });

    const [keywordResult, channelResult, timeResult, weekdayResult] = await Promise.all([
      supabase.from("erp_place_keyword_rows").select("upload_id,keyword,visit_count,previous_count,diff_count,diff_rate,purpose_class").in("upload_id", uploadIds).order("visit_count", { ascending: false }),
      supabase.from("erp_place_channel_rows").select("upload_id,channel,visit_count,previous_count,diff_count,diff_rate").in("upload_id", uploadIds).order("visit_count", { ascending: false }),
      supabase.from("erp_place_time_rows").select("upload_id,hour,visit_count,previous_count,diff_count,diff_rate").in("upload_id", uploadIds).order("hour"),
      supabase.from("erp_place_weekday_rows").select("upload_id,weekday,visit_count,previous_count,diff_count,diff_rate").in("upload_id", uploadIds),
    ]);
    const childError = keywordResult.error ?? channelResult.error ?? timeResult.error ?? weekdayResult.error;
    if (childError) throw childError;

    return NextResponse.json({
      uploads: (uploads ?? []).map((upload) => ({
        ...upload,
        keywords: (keywordResult.data ?? []).filter((row) => row.upload_id === upload.id),
        channels: (channelResult.data ?? []).filter((row) => row.upload_id === upload.id),
        hours: (timeResult.data ?? []).filter((row) => row.upload_id === upload.id),
        weekdays: (weekdayResult.data ?? []).filter((row) => row.upload_id === upload.id),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Place upload query failed" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let uploadId = "";
  try {
    const form = await request.formData();
    const storeId = String(form.get("storeId") ?? "").trim();
    const file = form.get("file");
    if (!storeId || !(file instanceof File)) {
      return NextResponse.json({ error: "storeId and CSV file are required" }, { status: 400 });
    }
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
