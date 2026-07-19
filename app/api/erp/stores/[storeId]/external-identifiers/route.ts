import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { StoreRecord, StoreValidationError, validateExternalIdentifier } from "@/lib/stores/registry";

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "owner", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("store_external_identifiers")
      .select("id,store_id,identifier_type,identifier_value,label,is_primary,metadata,created_at,updated_at")
      .eq("store_id", storeId)
      .order("identifier_type");
    if (error) throw error;
    return NextResponse.json({ identifiers: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Identifier query failed" }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as StoreRecord;
    const identifier = validateExternalIdentifier(body);
    const supabase = getSupabaseAdmin();
    const { data: store, error: storeError } = await supabase.from("erp_stores").select("id").eq("id", storeId).maybeSingle();
    if (storeError) throw storeError;
    if (!store) return NextResponse.json({ error: "store not found" }, { status: 404 });

    if (identifier.is_primary) {
      const { error: clearError } = await supabase
        .from("store_external_identifiers")
        .update({ is_primary: false })
        .eq("store_id", storeId)
        .eq("identifier_type", identifier.identifier_type)
        .eq("is_primary", true);
      if (clearError) throw clearError;
    }
    const { data, error } = await supabase
      .from("store_external_identifiers")
      .upsert({ store_id: storeId, ...identifier }, { onConflict: "store_id,identifier_type,identifier_value" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ identifier: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Identifier creation failed" },
      { status: error instanceof StoreValidationError ? 400 : 500 },
    );
  }
}
