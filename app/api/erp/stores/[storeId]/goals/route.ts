import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };

function optionalInteger(value: unknown, field: string, max = 10_000_000) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > max) throw new Error(`${field} is invalid`);
  return numeric;
}

function optionalMoney(value: unknown, field: string) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const numeric = Number(String(value).replaceAll(",", ""));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 9_999_999_999_999) throw new Error(`${field} is invalid`);
  return Math.round(numeric);
}

function optionalRate(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) throw new Error("targetReturnRate is invalid");
  return numeric;
}

function requireStaff(request: Request, storeId: string) {
  return authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
}

const FIELDS = "store_id,target_months,target_net_sales,target_new_customers,target_returning_customers,target_return_rate,target_average_ticket,table_count,cpc_cost_override,updated_at";

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = requireStaff(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const { data, error } = await getSupabaseAdmin().from("erp_store_goal_settings").select(FIELDS).eq("store_id", storeId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ goal: data ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Goal settings query failed" }, { status: 503 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = requireStaff(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as Record<string, unknown>;
    const targetMonths = optionalInteger(body.targetMonths, "targetMonths", 24) ?? 6;
    if (targetMonths < 1) throw new Error("targetMonths is invalid");
    const payload = {
      store_id: storeId,
      target_months: targetMonths,
      target_net_sales: optionalMoney(body.targetNetSales, "targetNetSales"),
      target_new_customers: optionalInteger(body.targetNewCustomers, "targetNewCustomers"),
      target_returning_customers: optionalInteger(body.targetReturningCustomers, "targetReturningCustomers"),
      target_return_rate: optionalRate(body.targetReturnRate),
      target_average_ticket: optionalMoney(body.targetAverageTicket, "targetAverageTicket"),
      table_count: optionalInteger(body.tableCount, "tableCount", 100_000),
      cpc_cost_override: optionalMoney(body.cpcCostOverride, "cpcCostOverride"),
    };
    const { data, error } = await getSupabaseAdmin().from("erp_store_goal_settings").upsert(payload, { onConflict: "store_id" }).select(FIELDS).single();
    if (error) throw error;
    return NextResponse.json({ goal: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Goal settings update failed";
    return NextResponse.json({ error: message }, { status: message.includes("invalid") ? 400 : 503 });
  }
}
