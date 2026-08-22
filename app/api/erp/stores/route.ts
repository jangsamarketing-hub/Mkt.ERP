import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildStoreInsert, StoreRecord, StoreValidationError } from "@/lib/stores/registry";
import { ensureActiveOrganizationId } from "@/lib/stores/organization";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("erp_stores")
      .select("*")
      .order("name");
    if (auth.session.storeIds !== "*") query = query.in("id", auth.session.storeIds);
    const { data, error } = await query;

    if (error) throw error;
    const stores = (data ?? []).filter((store) => includeArchived || (store.lifecycle_status ?? "active") !== "archived");
    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Store query failed") },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as StoreRecord;
    const supabase = getSupabaseAdmin();
    const requestedOrganizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
    const organizationId = requestedOrganizationId || await ensureActiveOrganizationId(supabase);

    const { data, error } = await supabase
      .from("erp_stores")
      .insert(buildStoreInsert(body, organizationId))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ store: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "매장 등록에 실패했습니다.") },
      { status: error instanceof StoreValidationError ? 400 : 500 },
    );
  }
}
