import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildStoreInsert } from "@/lib/stores/registry";
import { ensureActiveOrganizationId } from "@/lib/stores/organization";

const MAX_STORE_NAMES = 200;

function normalizeName(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("ko-KR");
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);

  try {
    const body = await request.json() as { names?: unknown };
    if (!Array.isArray(body.names)) return NextResponse.json({ error: "names array is required" }, { status: 400 });

    const names = Array.from(new Map(
      body.names
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.normalize("NFKC").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((name) => [normalizeName(name), name]),
    ).values());
    if (!names.length) return NextResponse.json({ error: "at least one store name is required" }, { status: 400 });
    if (names.length > MAX_STORE_NAMES) return NextResponse.json({ error: `up to ${MAX_STORE_NAMES} store names are allowed` }, { status: 413 });

    const supabase = getSupabaseAdmin();
    const organizationId = await ensureActiveOrganizationId(supabase);

    const { data: existing, error: existingError } = await supabase.from("erp_stores").select("name");
    if (existingError) throw existingError;
    const existingNames = new Set((existing ?? []).map((store) => normalizeName(String(store.name ?? ""))));
    const createNames = names.filter((name) => !existingNames.has(normalizeName(name)));
    const skipped = names.filter((name) => existingNames.has(normalizeName(name)));
    if (!createNames.length) return NextResponse.json({ created: [], skipped, failed: [] });

    const rows = createNames.map((name) => buildStoreInsert({ name }, organizationId));
    const { data: created, error: insertError } = await supabase.from("erp_stores").insert(rows).select("id,name");
    if (insertError) throw insertError;
    return NextResponse.json({ created: created ?? [], skipped, failed: [] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bulk store creation failed" }, { status: 500 });
  }
}
