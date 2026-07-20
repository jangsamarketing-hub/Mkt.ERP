import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildSalesHistoryMappingPreview, type ImportStoreSource } from "@/lib/jangsadoctor/mapping";

function sourcesFrom(value: unknown): ImportStoreSource[] | null {
  if (!Array.isArray(value)) return null;
  const sources: ImportStoreSource[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const source = item as Record<string, unknown>;
    const sourceCompanyId = typeof source.sourceCompanyId === "string" ? source.sourceCompanyId.trim() : "";
    const storeName = typeof source.storeName === "string" ? source.storeName.trim() : "";
    if (!sourceCompanyId || !storeName) return null;
    sources.push({ sourceCompanyId, storeName });
  }
  return sources;
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as { sources?: unknown };
    const sources = sourcesFrom(body.sources);
    if (!sources?.length) return NextResponse.json({ error: "sources with sourceCompanyId and storeName are required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const [{ data: stores, error: storesError }, { data: links, error: linksError }] = await Promise.all([
      supabase.from("erp_stores").select("id,name,environment,lifecycle_status,manager_name").order("name"),
      supabase.from("store_external_links").select("store_id,source_company_id").eq("source_system", "jangsadoctor_erp"),
    ]);
    if (storesError) throw storesError;
    if (linksError) throw linksError;

    const mapping = buildSalesHistoryMappingPreview(
      sources,
      (stores ?? []).map((store) => ({
        id: store.id,
        name: store.name,
        environment: store.environment,
        lifecycleStatus: store.lifecycle_status,
        managerName: store.manager_name,
      })),
      (links ?? []).map((link) => ({ sourceCompanyId: link.source_company_id, storeId: link.store_id })),
    );

    return NextResponse.json({
      mode: "mapping_preview",
      stores: stores ?? [],
      ...mapping,
      commitAvailable: false,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mapping preview failed" }, { status: 503 });
  }
}
