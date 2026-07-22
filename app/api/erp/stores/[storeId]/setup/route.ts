import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };

type SetupItemInput = {
  id?: unknown;
  label?: unknown;
  percent?: unknown;
  dueDate?: unknown;
  completed?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function setupAuth(request: Request, storeId: string) {
  return authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
}

function monthStart(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(text)) throw new Error("monthStart must be YYYY-MM");
  return `${text}-01`;
}

function optionalDate(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("dueDate must be YYYY-MM-DD");
  return text;
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) throw new Error("items must be an array");
  if (value.length > 100) throw new Error("items must contain 100 rows or fewer");
  return value.map((raw, index) => {
    const item = (raw ?? {}) as SetupItemInput;
    const label = String(item.label ?? "").trim();
    const percent = Number(item.percent ?? 0);
    if (!label || label.length > 200) throw new Error(`items[${index}].label is invalid`);
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error(`items[${index}].percent is invalid`);
    return {
      clientId: typeof item.id === "string" && UUID_PATTERN.test(item.id) ? item.id : null,
      label,
      progress_percent: percent,
      due_date: optionalDate(item.dueDate),
      completed: Boolean(item.completed),
      sort_order: index,
    };
  });
}

async function assertStoreExists(storeId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("erp_stores").select("id").eq("id", storeId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Store not found");
  return supabase;
}

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = setupAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const supabase = await assertStoreExists(storeId);
    const [monthsResult, itemsResult] = await Promise.all([
      supabase.from("erp_store_setup_months").select("month_start,created_at,updated_at").eq("store_id", storeId).order("month_start"),
      supabase.from("erp_store_setup_items").select("id,month_start,label,progress_percent,due_date,completed,sort_order,updated_at").eq("store_id", storeId).order("sort_order"),
    ]);
    if (monthsResult.error) throw monthsResult.error;
    if (itemsResult.error) throw itemsResult.error;
    return NextResponse.json({ months: monthsResult.data ?? [], items: itemsResult.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Setup query failed" }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = setupAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as { monthStart?: unknown };
    const normalizedMonth = monthStart(body.monthStart);
    const supabase = await assertStoreExists(storeId);
    const { data, error } = await supabase
      .from("erp_store_setup_months")
      .upsert({ store_id: storeId, month_start: normalizedMonth }, { onConflict: "store_id,month_start" })
      .select("month_start,created_at,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ month: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup month creation failed";
    return NextResponse.json({ error: message }, { status: message.includes("must be") ? 400 : 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = setupAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as { monthStart?: unknown; items?: unknown };
    const normalizedMonth = monthStart(body.monthStart);
    const items = normalizeItems(body.items);
    const supabase = await assertStoreExists(storeId);

    const { data: month, error: monthError } = await supabase
      .from("erp_store_setup_months")
      .select("month_start")
      .eq("store_id", storeId)
      .eq("month_start", normalizedMonth)
      .maybeSingle();
    if (monthError) throw monthError;
    if (!month) return NextResponse.json({ error: "Setup month not found" }, { status: 404 });

    const { data: existingRows, error: existingError } = await supabase
      .from("erp_store_setup_items")
      .select("id")
      .eq("store_id", storeId)
      .eq("month_start", normalizedMonth);
    if (existingError) throw existingError;

    const existingIds = new Set((existingRows ?? []).map((row) => row.id));
    const updateRows = items.filter((item) => item.clientId && existingIds.has(item.clientId));
    const insertRows = items.filter((item) => !item.clientId || !existingIds.has(item.clientId));
    if (updateRows.length) {
      for (const item of updateRows) {
        const { error } = await supabase.from("erp_store_setup_items").update({
          label: item.label,
          progress_percent: item.progress_percent,
          due_date: item.due_date,
          completed: item.completed,
          sort_order: item.sort_order,
        }).eq("id", item.clientId).eq("store_id", storeId);
        if (error) throw error;
      }
    }
    if (insertRows.length) {
      const { error } = await supabase.from("erp_store_setup_items").insert(insertRows.map((item) => ({
        store_id: storeId,
        month_start: normalizedMonth,
        label: item.label,
        progress_percent: item.progress_percent,
        due_date: item.due_date,
        completed: item.completed,
        sort_order: item.sort_order,
      })));
      if (error) throw error;
    }
    const retainedIds = new Set(updateRows.flatMap((item) => item.clientId ? [item.clientId] : []));
    const deletedIds = [...existingIds].filter((id) => !retainedIds.has(id));
    if (deletedIds.length) {
      const { error } = await supabase.from("erp_store_setup_items").delete().in("id", deletedIds).eq("store_id", storeId);
      if (error) throw error;
    }

    const { data, error } = await supabase
      .from("erp_store_setup_items")
      .select("id,month_start,label,progress_percent,due_date,completed,sort_order,updated_at")
      .eq("store_id", storeId)
      .eq("month_start", normalizedMonth)
      .order("sort_order");
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup save failed";
    return NextResponse.json({ error: message }, { status: message.includes("items[") || message.includes("must be") ? 400 : 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = setupAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const normalizedMonth = monthStart(new URL(request.url).searchParams.get("monthStart"));
    const supabase = await assertStoreExists(storeId);
    const { error } = await supabase
      .from("erp_store_setup_months")
      .delete()
      .eq("store_id", storeId)
      .eq("month_start", normalizedMonth);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup month deletion failed";
    return NextResponse.json({ error: message }, { status: message.includes("must be") ? 400 : 500 });
  }
}
