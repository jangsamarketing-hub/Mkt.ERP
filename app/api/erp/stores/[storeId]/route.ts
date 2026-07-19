import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildStorePatch, StoreRecord, StoreValidationError } from "@/lib/stores/registry";

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "owner", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const { data, error } = await getSupabaseAdmin().from("erp_stores").select("*").eq("id", storeId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "store not found" }, { status: 404 });
    return NextResponse.json({ store: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Store query failed" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as StoreRecord;
    const { data, error } = await getSupabaseAdmin()
      .from("erp_stores")
      .update(buildStorePatch(body))
      .eq("id", storeId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "store not found" }, { status: 404 });
    return NextResponse.json({ store: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Store update failed" },
      { status: error instanceof StoreValidationError ? 400 : 500 },
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: "hard delete is disabled; PATCH lifecycleStatus=archived instead" },
    { status: 405, headers: { Allow: "GET, PATCH" } },
  );
}
