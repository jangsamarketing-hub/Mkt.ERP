import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildStoreInsert, StoreRecord, StoreValidationError } from "@/lib/stores/registry";

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("erp_stores")
      .select("*")
      .order("name");

    if (error) throw error;
    const stores = (data ?? []).filter((store) => includeArchived || (store.lifecycle_status ?? "active") !== "archived");
    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Store query failed" },
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
    let organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
    if (!organizationId) {
      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .select("id")
        .eq("status", "active")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (organizationError) throw organizationError;
      organizationId = organization?.id ?? "";
    }
    if (!organizationId) {
      return NextResponse.json({ error: "active organization is required" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("erp_stores")
      .insert(buildStoreInsert(body, organizationId))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ store: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Store creation failed" },
      { status: error instanceof StoreValidationError ? 400 : 500 },
    );
  }
}
