import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "erp-private-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function safeFileName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export async function POST(request: Request) {
  const initialAuth = authenticateRequest(request);
  if (!initialAuth.ok) return authFailureResponse(initialAuth);
  try {
    const form = await request.formData();
    const storeId = String(form.get("storeId") ?? "").trim();
    const file = form.get("file");
    if (!storeId || !(file instanceof File)) return NextResponse.json({ error: "storeId and JSON file are required" }, { status: 400 });
    const storeAuth = authenticateRequest(request, { storeId });
    if (!storeAuth.ok) return authFailureResponse(storeAuth);
    if (!/\.json$/i.test(file.name)) return NextResponse.json({ error: "JSON file only" }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "JSON file must be 10 MB or smaller" }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const sourceHash = createHash("sha256").update(bytes).digest("hex");
    const payload = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
    const store = typeof payload.store === "object" && payload.store !== null ? payload.store as Record<string, unknown> : {};
    const period = typeof payload.period === "object" && payload.period !== null ? payload.period as Record<string, unknown> : {};
    const coverage = typeof payload.coverage === "object" && payload.coverage !== null ? payload.coverage : {};
    const quality = typeof payload.quality === "object" && payload.quality !== null ? payload.quality : {};
    const periodStart = typeof period.start_date === "string" ? period.start_date : null;
    const periodEnd = typeof period.end_date === "string" ? period.end_date : null;
    if (!periodStart || !periodEnd) return NextResponse.json({ error: "Naver JSON 기간(start_date, end_date)이 필요합니다." }, { status: 422 });

    const supabase = getSupabaseAdmin();
    const { data: selectedStore, error: storeError } = await supabase.from("erp_stores").select("id,name").eq("id", storeId).single();
    if (storeError || !selectedStore) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    const { data: duplicate } = await supabase.from("erp_naver_place_json_imports").select("id,file_name,period_start,period_end,status").eq("store_id", storeId).eq("source_hash", sourceHash).maybeSingle();
    if (duplicate) return NextResponse.json({ upload: duplicate, duplicate: true });

    const sourceStoreName = typeof store.store_name === "string" ? store.store_name : null;
    const warnings: string[] = [];
    if (sourceStoreName && sourceStoreName !== selectedStore.name) warnings.push("파일의 매장명과 선택한 매장명이 다릅니다. 관리자가 확인하세요.");
    const path = `${storeId}/naver-place-json/${periodStart}_${periodEnd}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "application/json", upsert: false });
    if (storageError) throw storageError;
    const { data: upload, error: insertError } = await supabase.from("erp_naver_place_json_imports").insert({
      store_id: storeId, file_name: file.name, source_hash: sourceHash, raw_storage_path: path,
      schema_version: typeof payload.schema_version === "string" ? payload.schema_version : null,
      source_store_name: sourceStoreName, period_start: periodStart, period_end: periodEnd,
      period_type: typeof period.period_type === "string" ? period.period_type : null,
      module_coverage: coverage, quality, warnings, status: "ready",
    }).select("id,file_name,period_start,period_end,status,warnings,uploaded_at").single();
    if (insertError) throw insertError;
    return NextResponse.json({ upload, duplicate: false }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Naver JSON upload failed" }, { status: 500 });
  }
}
