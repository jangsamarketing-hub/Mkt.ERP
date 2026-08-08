import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };
const STATUSES = new Set(["pending", "in_progress", "completed", "blocked"]);
const OWNERS = new Set(["company", "owner", "store_staff"]);

function dateOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function normalizeUpdate(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const owner = String(body.owner ?? "company");
  const status = String(body.status ?? "pending");
  if (!title || title.length > 200) throw new Error("업무 제목을 입력해주세요.");
  if (!OWNERS.has(owner) || !STATUSES.has(status)) throw new Error("업무 상태가 올바르지 않습니다.");
  const evidenceUrls = Array.isArray(body.evidenceUrls) ? body.evidenceUrls.map((value) => String(value).trim()).filter(Boolean).slice(0, 10) : [];
  return {
    title,
    owner,
    status,
    task_date: dateOrNull(body.taskDate),
    task_week: Number.isInteger(Number(body.taskWeek)) ? Number(body.taskWeek) : null,
    setup_item_id: String(body.setupItemId ?? "").trim() || null,
    public_visible: body.publicVisible !== false,
    evidence_text: String(body.evidenceText ?? "").trim() || null,
    evidence_urls: evidenceUrls,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "staff", "owner"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("erp_store_work_updates")
      .select("id,setup_item_id,task_date,task_week,title,owner,status,public_visible,evidence_text,evidence_urls,completed_at,created_at,updated_at")
      .eq("store_id", storeId)
      .order("task_date", { ascending: true, nullsFirst: false })
      .order("created_at");
    if (error) throw error;
    return NextResponse.json({ updates: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Work update query failed" }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const values = normalizeUpdate(await request.json() as Record<string, unknown>);
    const { data, error } = await getSupabaseAdmin().from("erp_store_work_updates").insert({ store_id: storeId, ...values }).select().single();
    if (error) throw error;
    return NextResponse.json({ update: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Work update save failed" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) throw new Error("업무 ID가 필요합니다.");
    const values = normalizeUpdate(body);
    const { data, error } = await getSupabaseAdmin().from("erp_store_work_updates").update(values).eq("id", id).eq("store_id", storeId).select().single();
    if (error) throw error;
    return NextResponse.json({ update: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Work update update failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "업무 ID가 필요합니다." }, { status: 400 });
  try {
    const { error } = await getSupabaseAdmin().from("erp_store_work_updates").delete().eq("id", id).eq("store_id", storeId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Work update delete failed" }, { status: 503 });
  }
}
