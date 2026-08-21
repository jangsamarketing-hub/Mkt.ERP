import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { activeFourWeekStart, buildFourWeekWorkPlan, workPlanDate } from "@/lib/work-plan";

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
  const requestedStatus = String(body.status ?? "pending");
  if (!title || title.length > 200) throw new Error("업무 제목을 입력해주세요.");
  if (!OWNERS.has(owner) || !STATUSES.has(requestedStatus)) throw new Error("업무 상태가 올바르지 않습니다.");

  const evidenceUrls = Array.isArray(body.evidenceUrls)
    ? body.evidenceUrls.map((value) => String(value).trim()).filter(Boolean).slice(0, 10)
    : [];
  const evidenceText = String(body.evidenceText ?? "").trim() || null;
  // 기입/첨부가 실제로 있는 경우에만 자동으로 기입완료 처리한다.
  const status = evidenceText || evidenceUrls.length
    ? "completed"
    : requestedStatus === "blocked" ? "blocked" : "pending";

  return {
    title,
    owner,
    status,
    task_date: dateOrNull(body.taskDate),
    task_week: Number.isInteger(Number(body.taskWeek)) ? Number(body.taskWeek) : null,
    setup_item_id: String(body.setupItemId ?? "").trim() || null,
    public_visible: body.publicVisible !== false,
    evidence_text: evidenceText,
    evidence_urls: evidenceUrls,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
}

async function ensureCurrentFourWeekPlan(storeId: string) {
  const supabase = getSupabaseAdmin();
  const { data: store, error: storeError } = await supabase
    .from("erp_stores")
    .select("management_start_date,lifecycle_status")
    .eq("id", storeId)
    .maybeSingle();
  if (storeError) throw storeError;
  if (!store?.management_start_date || store.lifecycle_status === "archived") return;

  const cycleStart = activeFourWeekStart(String(store.management_start_date));
  const planned = buildFourWeekWorkPlan();
  const cycleEnd = workPlanDate(cycleStart, { week: 4, dayOffset: 27, title: "" });
  const { data: existing, error: existingError } = await supabase
    .from("erp_store_work_updates")
    .select("task_date,task_week,title")
    .eq("store_id", storeId)
    .gte("task_date", cycleStart)
    .lte("task_date", cycleEnd);
  if (existingError) throw existingError;

  const existingKeys = new Set((existing ?? []).map((item) => `${item.task_week}|${item.task_date}|${item.title}`));
  const missing = planned
    .map((item) => ({
      store_id: storeId,
      task_week: item.week,
      task_date: workPlanDate(cycleStart, item),
      title: item.title,
      owner: "company",
      status: "pending",
      public_visible: true,
      evidence_urls: [],
    }))
    .filter((item) => !existingKeys.has(`${item.task_week}|${item.task_date}|${item.title}`));
  if (!missing.length) return;
  const { error: insertError } = await supabase.from("erp_store_work_updates").insert(missing);
  if (insertError) throw insertError;
}

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "staff", "owner"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    await ensureCurrentFourWeekPlan(storeId);
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
